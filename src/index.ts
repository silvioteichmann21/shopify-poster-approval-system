import { Hono } from 'hono';
import { renderAdminPage, renderApprovePage, renderHomePage } from './html';
import {
  nowIso,
  badRequest,
  json,
  notFound,
  requireAdmin,
  unauthorized,
  assertValidShop,
  buildShopifyHmacMessage,
  constantTimeEquals,
  hmacSha256Hex,
} from './util';
import type { ApprovalRow, ApprovalStatus } from './types';
import { appendOrderNote, findOrderByName, getOrderById, createTransaction, type ShopifyConfig } from './shopify';
import {
  isValidKlaviyoProfileEmail,
  klaviyoNotifyAdmin,
  klaviyoNotifyCustomer,
  type KlaviyoSendResult,
} from './klaviyo';
import type { Env } from './worker_env';
import { normalizeToE164 } from './openphone';
import { SmsAutomation } from './sms_automation';

const app = new Hono<{ Bindings: Env }>();

function getD1(env: Env): D1Database {
  const db = env.DB ?? env.poster_approvals;
  if (!db) {
    throw new Error('D1 binding missing: set [[d1_databases]] binding = "DB" (or name it poster_approvals).');
  }
  return db;
}

app.onError((err, c) => {
  const message = err instanceof Error ? err.message : String(err);
  return c.json({ ok: false, error: message }, 500);
});

function isNumeric(s: string) {
  return /^[0-9]+$/.test(s);
}

function newToken() {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
}

async function getShopAccessToken(db: D1Database, shop: string): Promise<string | null> {
  const row = await db.prepare('SELECT access_token FROM shops WHERE shop = ?1').bind(shop).first<{ access_token: string }>();
  return row?.access_token || null;
}

async function upsertShopAccessToken(db: D1Database, shop: string, accessToken: string) {
  const now = nowIso();
  await db.prepare(
    `INSERT INTO shops (shop, access_token, installed_at, updated_at)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(shop) DO UPDATE SET
       access_token=excluded.access_token,
       updated_at=excluded.updated_at`
  ).bind(shop, accessToken, now, now).run();
}

async function createOauthState(db: D1Database, shop: string) {
  const state = newToken();
  await db.prepare('INSERT INTO oauth_states (state, shop, created_at) VALUES (?1, ?2, ?3)').bind(state, shop, nowIso()).run();
  return state;
}

async function consumeOauthState(db: D1Database, state: string) {
  const row = await db.prepare('SELECT shop FROM oauth_states WHERE state = ?1').bind(state).first<{ shop: string }>();
  if (!row?.shop) return null;
  await db.prepare('DELETE FROM oauth_states WHERE state = ?1').bind(state).run();
  return row.shop;
}

function publicBaseUrl(c: any) {
  const envBase = c.env.PUBLIC_BASE_URL?.trim();
  if (envBase) return envBase.replace(/\/$/, '');
  // Fallback: derive from request origin
  const u = new URL(c.req.url);
  return `${u.protocol}//${u.host}`;
}

async function shopifyConfigForRequest(c: any, shopOverride?: string): Promise<ShopifyConfig> {
  const shop = (shopOverride || c.req.query('shop') || c.env.SHOPIFY_SHOP_DOMAIN || '').trim();
  if (!shop) throw new Error('Shop not configured. Set SHOPIFY_SHOP_DOMAIN or provide ?shop=');
  assertValidShop(shop);
  const token = await getShopAccessToken(getD1(c.env), shop);
  if (!token) {
    const install = `${publicBaseUrl(c)}/auth/install?shop=${encodeURIComponent(shop)}`;
    throw new Error(`App not installed for ${shop}. Open this link while logged into Shopify Admin for that store: ${install}`);
  }
  return { shop, apiVersion: c.env.SHOPIFY_API_VERSION, accessToken: token };
}

async function getApproval(db: D1Database, id: string): Promise<ApprovalRow | null> {
  const row = await db.prepare('SELECT * FROM approvals WHERE id = ?1').bind(id).first<ApprovalRow>();
  return row || null;
}

async function getApprovalByOrderId(db: D1Database, orderId: number): Promise<ApprovalRow | null> {
  const row = await db.prepare('SELECT * FROM approvals WHERE order_id = ?1 ORDER BY created_at DESC LIMIT 1').bind(orderId).first<ApprovalRow>();
  return row || null;
}

async function upsertApproval(db: D1Database, a: {
  id: string;
  order_id: number;
  order_name?: string | null;
  customer_email?: string | null;
  poster_title?: string | null;
  preview_image_url?: string | null;
  status: ApprovalStatus;
  edit_note?: string | null;
  acted_at?: string | null;
}) {
  const existing = await getApproval(db, a.id);
  const created_at = existing?.created_at || nowIso();
  const updated_at = nowIso();
  await db.prepare(
    `INSERT INTO approvals (id, order_id, order_name, customer_email, poster_title, preview_image_url, status, edit_note, created_at, updated_at, acted_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
     ON CONFLICT(id) DO UPDATE SET
       order_id=excluded.order_id,
       order_name=excluded.order_name,
       customer_email=excluded.customer_email,
       poster_title=excluded.poster_title,
       preview_image_url=excluded.preview_image_url,
       status=excluded.status,
       edit_note=excluded.edit_note,
       updated_at=excluded.updated_at,
       acted_at=excluded.acted_at`
  ).bind(
    a.id,
    a.order_id,
    a.order_name || null,
    a.customer_email || null,
    a.poster_title || null,
    a.preview_image_url || null,
    a.status,
    a.edit_note || null,
    created_at,
    updated_at,
    a.acted_at || null
  ).run();
}

async function klaviyoPosterPair(
  env: Env,
  customerMetric: string,
  adminMetric: string,
  customerEmail: string | null | undefined,
  props: Record<string, unknown>,
  uniqueId: string
): Promise<{ customer: KlaviyoSendResult | null; admin: KlaviyoSendResult | null }> {
  const key = env.KLAVIYO_PRIVATE_API_KEY;
  const customer = await klaviyoNotifyCustomer(key, customerMetric, customerEmail, props, uniqueId);
  const admin = await klaviyoNotifyAdmin(key, adminMetric, env.ADMIN_NOTIFY_EMAIL, props, `${uniqueId}_admin`);
  return { customer, admin };
}

/** Explains customer metric outcome in admin JSON (API errors were previously invisible). */
function klaviyoCustomerSummary(
  env: Env,
  orderEmail: string | null | undefined,
  result: KlaviyoSendResult | null
) {
  if (!env.KLAVIYO_PRIVATE_API_KEY?.trim()) {
    return {
      event_sent: false,
      reason: 'KLAVIYO_PRIVATE_API_KEY not set on the Worker (wrangler secret).',
    };
  }
  if (!orderEmail?.trim()) {
    return {
      event_sent: false,
      reason: 'Shopify order has no customer email; Klaviyo needs an email on the profile.',
    };
  }
  if (!isValidKlaviyoProfileEmail(orderEmail)) {
    return { event_sent: false, reason: 'Order email is missing or invalid for Klaviyo.' };
  }
  if (result === null) {
    return { event_sent: false, reason: 'Klaviyo customer call was skipped.' };
  }
  if (result.ok) {
    return {
      event_sent: true,
      flow_hint:
        'If the customer still gets no email: check spam; Klaviyo profile suppressions; Flow email step (marketing vs transactional); and domain authentication. Klaviyo dedupes identical unique_id — each upsert now uses a new id.',
    };
  }
  return {
    event_sent: false,
    reason: 'Klaviyo API error',
    http_status: result.status,
    detail: result.detail,
  };
}

/** Fire-and-forget POST: generic JSON, or Slack `text` if URL is a Slack incoming webhook. */
function notifyAdminWebhook(env: Env, event: string, props: Record<string, unknown>) {
  const url = env.ADMIN_WEBHOOK_URL?.trim();
  if (!url) return;
  const sent_at = new Date().toISOString();
  const summary = event.replace(/^poster_customer_/, '').replace(/_/g, ' ');
  const isSlack = /hooks\.slack\.com\//i.test(url);
  let body: string;
  if (isSlack) {
    const lines = [`*Poster approval — ${summary}*`, `When: ${sent_at}`];
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === '') continue;
      lines.push(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
    }
    body = JSON.stringify({ text: lines.join('\n') });
  } else {
    body = JSON.stringify({ event, ...props, sent_at });
  }
  void fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  }).catch(() => {});
}

async function notifyAdminOfCustomerAction(
  env: Env,
  event: string,
  row: ApprovalRow,
  baseUrl: string,
  extra: Record<string, unknown>
) {
  const approve_url = `${baseUrl}/approve/${row.id}`;
  const props = {
    order_id: row.order_id,
    order_name: row.order_name,
    customer_email: row.customer_email,
    approval_token: row.id,
    approve_url,
    ...extra,
  };
  notifyAdminWebhook(env, event, props);
}

app.get('/', (c) => c.html(renderHomePage({ baseUrl: publicBaseUrl(c) })));

function corsHeaders(origin: string | null | undefined) {
  // Storefronts may call cross-origin (Shopify domain → workers.dev).
  // We allow all origins here since this endpoint only triggers admin-side notifications.
  return {
    'access-control-allow-origin': origin || '*',
    'access-control-allow-methods': 'POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  } as Record<string, string>;
}

// NOTE: OpenPhone SMS is triggered directly from POST /api/poster-lead.

type PosterReservationLeadPayload = {
  // Step 2
  firstName?: string;
  phoneNumber?: string;
  phoneCountry?: string;
  step2SubmittedAt?: string;
  // Step 1 (from localStorage posterReservationData)
  variantId?: number | string | null;
  variantTitle?: string;
  size?: string;
  finish?: string;
  design?: string;
  year?: string;
  make?: string;
  model?: string;
  color?: string;
  specialNotes?: string;
  uploadChoice?: string;
  uploadPhotoFileName?: string | null;
  uploadPhotoDataUrl?: string | null;
  productTitle?: string;
  productHandle?: string;
  productUrl?: string;
  priceDisplay?: string;
  compareAtDisplay?: string;
  savedAt?: string;
};

function summarizeLeadPayload(raw: PosterReservationLeadPayload) {
  const safe = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const firstName = safe(raw.firstName);
  const phoneNumber = safe(raw.phoneNumber);
  const productTitle = safe(raw.productTitle);
  const productUrl = safe(raw.productUrl);
  const vehicle = [safe(raw.year), safe(raw.make), safe(raw.model)].filter(Boolean).join(' ');
  const finish = safe(raw.finish);
  const size = safe(raw.size);
  const design = safe(raw.design);
  const headline = `New poster lead — ${firstName || 'Unknown'}${phoneNumber ? ` (${phoneNumber})` : ''}`;
  const details = {
    firstName,
    phoneNumber,
    phoneCountry: safe(raw.phoneCountry),
    productTitle,
    productUrl,
    vehicle,
    color: safe(raw.color),
    finish,
    size,
    design,
    specialNotes: safe(raw.specialNotes),
    uploadChoice: safe(raw.uploadChoice),
    uploadPhotoFileName: typeof raw.uploadPhotoFileName === 'string' ? raw.uploadPhotoFileName : '',
    priceDisplay: safe(raw.priceDisplay),
    compareAtDisplay: safe(raw.compareAtDisplay),
    variantId: raw.variantId ?? null,
    variantTitle: safe(raw.variantTitle),
    savedAt: safe(raw.savedAt),
    step2SubmittedAt: safe(raw.step2SubmittedAt),
  };
  return { headline, details };
}

// Poster reservation lead endpoint (Page 2 submit)
app.options('/api/poster-lead', (c) => {
  const origin = c.req.header('origin') || null;
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
});

app.post('/api/poster-lead', async (c) => {
  const origin = c.req.header('origin') || null;
  const payload = (await c.req.json().catch(() => null)) as PosterReservationLeadPayload | null;
  if (!payload) return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders(origin), 'content-type': 'application/json' } });

  const firstName = (payload.firstName || '').trim();
  const phoneNumber = (payload.phoneNumber || '').trim();
  if (!firstName || !phoneNumber) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing firstName or phoneNumber' }), {
      status: 400,
      headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
    });
  }

  // Also trigger OpenPhone SMS from the same lead submit (no Klaviyo Form dependency).
  // This keeps the existing "lead email" behavior intact while ensuring SMS works for the live site flow.
  const phone_e164 = normalizeToE164(phoneNumber);
  let openphone_sms: any = null;
  const openphone_configured = Boolean((c.env.OPENPHONE_API_KEY || '').trim()) && Boolean((c.env.OPENPHONE_FROM_NUMBER_ID || '').trim());
  if (!openphone_configured) {
    openphone_sms = {
      ok: false,
      skipped: true,
      reason:
        !(c.env.OPENPHONE_API_KEY || '').trim()
          ? 'OPENPHONE_API_KEY is not set (wrangler secret).'
          : 'OPENPHONE_FROM_NUMBER_ID is not set in wrangler.toml.',
    };
  } else if (phone_e164 && c.env.SMS_AUTOMATION) {
    try {
      const ns = c.env.SMS_AUTOMATION;
      const stub = ns.get(ns.idFromName(phone_e164));
      const resp = await stub.fetch('https://sms-automation/schedule-sms1', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName,
          phoneNumber: phone_e164,
          year: typeof payload.year === 'string' ? payload.year : '',
          make: typeof payload.make === 'string' ? payload.make : '',
          model: typeof payload.model === 'string' ? payload.model : '',
        }),
      });
      const txt = await resp.text();
      try {
        openphone_sms = txt ? JSON.parse(txt) : { ok: resp.ok };
      } catch {
        openphone_sms = { ok: resp.ok, raw: txt };
      }
    } catch (e) {
      openphone_sms = { ok: false, error: 'Failed to schedule SMS' };
    }
  } else if (!phone_e164) {
    openphone_sms = { ok: false, skipped: true, reason: 'Invalid phone number for SMS (expected E.164).' };
  } else {
    openphone_sms = { ok: false, skipped: true, reason: 'SMS_AUTOMATION binding missing.' };
  }

  const notifyEmail = (c.env.LEAD_NOTIFY_EMAIL || c.env.ADMIN_NOTIFY_EMAIL || '').trim();
  const key = c.env.KLAVIYO_PRIVATE_API_KEY;
  const { headline, details } = summarizeLeadPayload(payload);
  const klaviyo =
    key && notifyEmail && isValidKlaviyoProfileEmail(notifyEmail)
      ? await klaviyoNotifyAdmin(
          key,
          'poster_reservation_lead',
          notifyEmail,
          {
            ...payload,
            headline,
            summary: details,
          },
          `lead_${Date.now()}_${Math.random().toString(16).slice(2)}`
        )
      : null;

  return new Response(
    JSON.stringify({
      ok: true,
      notify_email: notifyEmail || null,
      klaviyo,
      openphone_configured,
      openphone_sms,
      note:
        klaviyo?.ok === true
          ? 'Klaviyo accepted event. Create a Flow triggered by metric "poster_reservation_lead" to email you.'
          : !key
            ? 'KLAVIYO_PRIVATE_API_KEY not set; nothing was sent.'
            : !notifyEmail
              ? 'LEAD_NOTIFY_EMAIL (or ADMIN_NOTIFY_EMAIL) not set; nothing was sent.'
              : 'Klaviyo call skipped or failed. Check details.',
    }),
    { status: 200, headers: { ...corsHeaders(origin), 'content-type': 'application/json' } }
  );
});

// Legacy + debug endpoints (optional).
// Kept so you can test SMS without relying on the storefront form.
app.post('/api/openphone/lead', async (c) => {
  const body = (await c.req.json().catch(() => null)) as any;
  if (!body) return badRequest('Invalid JSON.');
  const safe = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const firstName = safe(body.firstName || body.first_name || body.firstname);
  const phoneNumber = safe(body.phoneNumber || body.phone_number || body.phone);
  const year = safe(body.year);
  const make = safe(body.make);
  const model = safe(body.model);
  if (!phoneNumber) return badRequest('Missing phoneNumber.');

  const phone_e164 = normalizeToE164(phoneNumber);
  if (!phone_e164) return badRequest('Invalid phone number.');
  if (!c.env.SMS_AUTOMATION) return badRequest('SMS_AUTOMATION binding missing.');

  const stub = c.env.SMS_AUTOMATION.get(c.env.SMS_AUTOMATION.idFromName(phone_e164));
  const resp = await stub.fetch('https://sms-automation/schedule-sms1', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ firstName, phoneNumber: phone_e164, year, make, model }),
  });
  const out = await resp.text();
  return new Response(out, { status: resp.status, headers: { 'content-type': 'application/json' } });
});

app.get('/api/openphone/status', async (c) => {
  const phone = (c.req.query('phone') || '').trim();
  const phone_e164 = normalizeToE164(phone);
  if (!phone_e164) return badRequest('Provide ?phone= in E.164 (e.g. +14135551234).');
  if (!c.env.SMS_AUTOMATION) return badRequest('SMS_AUTOMATION binding missing.');
  const stub = c.env.SMS_AUTOMATION.get(c.env.SMS_AUTOMATION.idFromName(phone_e164));
  const resp = await stub.fetch('https://sms-automation/status', { method: 'GET' });
  const out = await resp.text();
  return new Response(out, { status: resp.status, headers: { 'content-type': 'application/json' } });
});

// OAuth install start: /auth/install?shop=yourshop.myshopify.com
app.get('/auth/install', async (c) => {
  const shop = (c.req.query('shop') || c.env.SHOPIFY_SHOP_DOMAIN || '').trim();
  if (!shop) return badRequest('Missing shop. Use ?shop=YOURSHOP.myshopify.com');
  assertValidShop(shop);
  if (!c.env.SHOPIFY_API_KEY) return badRequest('SHOPIFY_API_KEY not set on Worker.');
  const state = await createOauthState(getD1(c.env), shop);
  const redirectUri = `${publicBaseUrl(c)}/auth/callback`;
  const scope = encodeURIComponent('read_orders,write_orders');
  const installUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${encodeURIComponent(c.env.SHOPIFY_API_KEY)}` +
    `&scope=${scope}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}`;
  return c.redirect(installUrl);
});

// OAuth callback: Shopify redirects here after approval
app.get('/auth/callback', async (c) => {
  const url = new URL(c.req.url);
  const params = url.searchParams;
  const code = params.get('code') || '';
  const hmac = params.get('hmac') || '';
  const state = params.get('state') || '';

  if (!code || !hmac || !state) return badRequest('Missing required OAuth params.');
  if (!c.env.SHOPIFY_API_SECRET) return badRequest('SHOPIFY_API_SECRET not set on Worker.');

  // Verify HMAC
  const msg = buildShopifyHmacMessage(params);
  const expected = await hmacSha256Hex(c.env.SHOPIFY_API_SECRET, msg);
  if (!(await constantTimeEquals(expected, hmac))) return unauthorized('HMAC validation failed.');

  const shop = await consumeOauthState(getD1(c.env), state);
  if (!shop) return unauthorized('Invalid state.');

  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_id: c.env.SHOPIFY_API_KEY,
      client_secret: c.env.SHOPIFY_API_SECRET,
      code,
    }),
  });
  const tokenBody = await tokenRes.json().catch(() => null) as any;
  const accessToken = tokenBody?.access_token;
  if (!tokenRes.ok || !accessToken) {
    return badRequest(`Token exchange failed: ${tokenRes.status} ${JSON.stringify(tokenBody)}`);
  }

  await upsertShopAccessToken(getD1(c.env), shop, accessToken);
  return c.html(`<!doctype html><html><body style="font-family:system-ui;padding:28px"><h2>Installed ✅</h2><p>App is installed for <strong>${shop}</strong>.</p><p>You can now use <a href="/admin">/admin</a>.</p></body></html>`);
});

// Customer-facing approval page
app.get('/approve/:token', async (c) => {
  const token = c.req.param('token');
  return c.html(renderApprovePage(token));
});

// Customer-facing API
app.get('/api/approval/:token', async (c) => {
  const token = c.req.param('token');
  const row = await getApproval(getD1(c.env), token);
  if (!row) return notFound('This preview link is invalid or expired.');
  if (row.status === 'pending_preview') return badRequest('Your preview is not ready yet.');
  return json({
    ok: true,
    approval: {
      id: row.id,
      order_id: row.order_id,
      order_name: row.order_name,
      poster_title: row.poster_title,
      preview_image_url: row.preview_image_url,
      status: row.status,
    },
  });
});

app.post('/api/approval/:token/edits', async (c) => {
  const token = c.req.param('token');
  const row = await getApproval(getD1(c.env), token);
  if (!row) return notFound('This preview link is invalid or expired.');
  const body = await c.req.json().catch(() => null) as { note?: string } | null;
  const note = (body?.note || '').trim();
  if (!note) return badRequest('Please enter your revision notes.');
  if (row.status === 'approved') return badRequest('This order was already approved.');
  if (row.status === 'declined') return badRequest('This order was already declined.');

  await upsertApproval(getD1(c.env), {
    id: row.id,
    order_id: row.order_id,
    order_name: row.order_name,
    customer_email: row.customer_email,
    poster_title: row.poster_title,
    preview_image_url: row.preview_image_url,
    status: 'edits_requested',
    edit_note: note,
    acted_at: nowIso(),
  });

  const cfg = await shopifyConfigForRequest(c);
  try {
    await appendOrderNote(cfg, row.order_id, `REVISION REQUEST:\n${note}`);
  } catch {
    /* non-fatal: customer action still recorded */
  }
  const base = (c.env.PUBLIC_BASE_URL || publicBaseUrl(c)).replace(/\/$/, '');
  const approveUrl = `${base}/approve/${row.id}`;
  await klaviyoPosterPair(
    c.env,
    'poster_edits_requested',
    'poster_admin_edits_requested',
    row.customer_email,
    {
      order_id: row.order_id,
      order_name: row.order_name,
      customer_email: row.customer_email,
      revision_note: note,
      approve_url: approveUrl,
    },
    `edits_${row.order_id}_${row.id}_${Date.now()}`
  );
  notifyAdminOfCustomerAction(c.env, 'poster_customer_edits_requested', row, base, { revision_note: note });

  return json({ ok: true });
});

app.post('/api/approval/:token/approve', async (c) => {
  const token = c.req.param('token');
  const row = await getApproval(getD1(c.env), token);
  if (!row) return notFound('This preview link is invalid or expired.');
  if (row.status === 'approved') return json({ ok: true, already: true });
  if (row.status === 'declined') return badRequest('This order was already declined.');
  if (!row.preview_image_url) return badRequest('Preview not ready.');

  const cfg = await shopifyConfigForRequest(c);
  const resp = await createTransaction(cfg, row.order_id, 'capture');
  if (resp.status >= 400) return resp;

  await upsertApproval(getD1(c.env), {
    id: row.id,
    order_id: row.order_id,
    order_name: row.order_name,
    customer_email: row.customer_email,
    poster_title: row.poster_title,
    preview_image_url: row.preview_image_url,
    status: 'approved',
    acted_at: nowIso(),
  });
  try {
    await appendOrderNote(cfg, row.order_id, 'Customer approved the poster preview. Payment was captured.');
  } catch {
    /* non-fatal */
  }
  const base = (c.env.PUBLIC_BASE_URL || publicBaseUrl(c)).replace(/\/$/, '');
  const approveUrl = `${base}/approve/${row.id}`;
  await klaviyoPosterPair(
    c.env,
    'poster_approved',
    'poster_admin_approved',
    row.customer_email,
    {
      order_id: row.order_id,
      order_name: row.order_name,
      customer_email: row.customer_email,
      approve_url: approveUrl,
    },
    `approved_${row.order_id}_${row.id}`
  );
  notifyAdminOfCustomerAction(c.env, 'poster_customer_approved', row, base, {});
  return json({ ok: true });
});

app.post('/api/approval/:token/decline', async (c) => {
  const token = c.req.param('token');
  const row = await getApproval(getD1(c.env), token);
  if (!row) return notFound('This preview link is invalid or expired.');
  if (row.status === 'declined') return json({ ok: true, already: true });
  if (row.status === 'approved') return badRequest('This order was already approved.');

  const cfg = await shopifyConfigForRequest(c);
  const resp = await createTransaction(cfg, row.order_id, 'void');
  if (resp.status >= 400) return resp;

  await upsertApproval(getD1(c.env), {
    id: row.id,
    order_id: row.order_id,
    order_name: row.order_name,
    customer_email: row.customer_email,
    poster_title: row.poster_title,
    preview_image_url: row.preview_image_url,
    status: 'declined',
    acted_at: nowIso(),
  });
  try {
    await appendOrderNote(cfg, row.order_id, 'Customer declined the poster preview. Authorization was voided.');
  } catch {
    /* non-fatal */
  }
  const base = (c.env.PUBLIC_BASE_URL || publicBaseUrl(c)).replace(/\/$/, '');
  const approveUrl = `${base}/approve/${row.id}`;
  await klaviyoPosterPair(
    c.env,
    'poster_declined',
    'poster_admin_declined',
    row.customer_email,
    {
      order_id: row.order_id,
      order_name: row.order_name,
      customer_email: row.customer_email,
      approve_url: approveUrl,
    },
    `declined_${row.order_id}_${row.id}`
  );
  notifyAdminOfCustomerAction(c.env, 'poster_customer_declined', row, base, {});
  return json({ ok: true });
});

// Admin UI (Basic Auth with ADMIN_PASSWORD)
app.get('/admin', async (c) => {
  const ok = await requireAdmin(c.req.raw, c.env);
  if (!ok) {
    return new Response('Auth required', {
      status: 401,
      headers: { 'www-authenticate': 'Basic realm="Poster Approval Admin", charset="UTF-8"' },
    });
  }
  return c.html(renderAdminPage({ notifyEmail: c.env.ADMIN_NOTIFY_EMAIL }));
});

app.post('/admin/api/lookup', async (c) => {
  const ok = await requireAdmin(c.req.raw, c.env);
  if (!ok) return unauthorized();
  const body = await c.req.json().catch(() => null) as { ref?: string } | null;
  const ref = (body?.ref || '').trim();
  if (!ref) return badRequest('Missing ref.');

  const cfg = await shopifyConfigForRequest(c);
  let orderId: number | null = null;
  if (isNumeric(ref)) {
    // Could be order_id OR order_number. Try order id first; if missing, try name.
    const asId = Number(ref);
    try {
      const o = await getOrderById(cfg, asId);
      orderId = o.id;
    } catch {
      const o2 = await findOrderByName(cfg, ref);
      orderId = o2?.id || null;
    }
  } else {
    const o = await findOrderByName(cfg, ref);
    orderId = o?.id || null;
  }
  if (!orderId) return notFound('Order not found.');

  const existing = await getApprovalByOrderId(getD1(c.env), orderId);
  if (!existing) return notFound('No approval token exists for that order yet.');

  const approveUrl = `${(c.env.PUBLIC_BASE_URL || c.req.url.replace(/\/admin.*/, ''))}/approve/${existing.id}`;
  return json({ ok: true, order_id: orderId, token: existing.id, approve_url: approveUrl, status: existing.status });
});

app.post('/admin/api/upsert', async (c) => {
  const ok = await requireAdmin(c.req.raw, c.env);
  if (!ok) return unauthorized();

  const body = await c.req.json().catch(() => null) as { ref?: string; poster_title?: string; preview_image_url?: string } | null;
  const ref = (body?.ref || '').trim();
  const poster_title = (body?.poster_title || '').trim() || null;
  const preview_image_url = (body?.preview_image_url || '').trim();
  if (!ref) return badRequest('Missing ref.');
  if (!preview_image_url) return badRequest('Missing preview_image_url.');

  const cfg = await shopifyConfigForRequest(c);
  let order: any | null = null;
  if (isNumeric(ref)) {
    const asId = Number(ref);
    try {
      order = await getOrderById(cfg, asId);
    } catch {
      const hit = await findOrderByName(cfg, ref);
      if (hit?.id) order = await getOrderById(cfg, hit.id);
    }
  } else {
    const hit = await findOrderByName(cfg, ref);
    if (hit?.id) order = await getOrderById(cfg, hit.id);
  }
  if (!order?.id) return notFound('Order not found.');

  const existing = await getApprovalByOrderId(getD1(c.env), order.id);
  const token = existing?.id || newToken();

  await upsertApproval(getD1(c.env), {
    id: token,
    order_id: order.id,
    order_name: order.name || null,
    customer_email: order.email || null,
    poster_title,
    preview_image_url,
    status: 'preview_ready',
  });

  const base = (c.env.PUBLIC_BASE_URL || c.req.url.replace(/\/admin\/api\/upsert.*/, '')).replace(/\/$/, '');
  const approveUrl = `${base}/approve/${token}`;

  const themeBase = (c.env.THEME_APPROVAL_PAGE_URL || '').trim().replace(/\/$/, '');
  const theme_bridge_url = themeBase ? `${themeBase}?token=${encodeURIComponent(token)}` : null;

  // unique_id must change per send: Klaviyo drops duplicate unique_id events, so repeat "Create/Update" would not re-trigger the flow.
  const klaviyoUnique = `preview_${order.id}_${token}_${Date.now()}`;
  const klaviyo = await klaviyoPosterPair(
    c.env,
    'poster_preview_ready',
    'poster_admin_preview_ready',
    order.email,
    {
      order_id: order.id,
      order_name: order.name,
      customer_email: order.email,
      approve_url: approveUrl,
      theme_bridge_url,
      preview_image_url,
      poster_title,
    },
    klaviyoUnique
  );

  return json({
    ok: true,
    order_id: order.id,
    order_name: order.name,
    customer_email: order.email,
    token,
    approve_url: approveUrl,
    theme_bridge_url,
    theme_bridge_url_hint: theme_bridge_url
      ? `Send customer: ${theme_bridge_url}`
      : `Set THEME_APPROVAL_PAGE_URL in wrangler.toml for a ready-to-send store link, or use: https://YOUR_DOMAIN/pages/YOUR_PAGE_HANDLE?token=${token}`,
    klaviyo_customer: klaviyoCustomerSummary(c.env, order.email, klaviyo.customer),
  });
});

export default app;
export { SmsAutomation };

