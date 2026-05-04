import { badRequest, serverError } from './util';

export type ShopifyConfig = {
  shop: string;          // *.myshopify.com
  apiVersion: string;    // e.g. "2026-01"
  accessToken: string;   // Admin API token (OAuth or custom app)
};

async function shopifyFetch(cfg: ShopifyConfig, path: string, init?: RequestInit) {
  if (!cfg.shop) throw new Error('Shop not set');
  if (!cfg.accessToken) throw new Error('Access token not set');

  const url = `https://${cfg.shop}/admin/api/${cfg.apiVersion}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-shopify-access-token': cfg.accessToken,
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { res, body };
}

export async function getOrderById(cfg: ShopifyConfig, orderId: number) {
  const { res, body } = await shopifyFetch(cfg, `/orders/${orderId}.json?fields=id,name,email,total_price,currency,financial_status,fulfillment_status,line_items,customer`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error(`Shopify getOrderById failed: ${res.status} ${JSON.stringify(body)}`);
  return body.order as any;
}

export async function findOrderByName(cfg: ShopifyConfig, orderNameOrNumber: string) {
  // Shopify "name" includes leading "#", but query accepts either in practice.
  const name = orderNameOrNumber.startsWith('#') ? orderNameOrNumber : `#${orderNameOrNumber}`;
  const { res, body } = await shopifyFetch(cfg, `/orders.json?status=any&name=${encodeURIComponent(name)}&limit=1&fields=id,name,email`, {
    method: 'GET',
  });
  if (!res.ok) throw new Error(`Shopify findOrderByName failed: ${res.status} ${JSON.stringify(body)}`);
  const order = (body.orders || [])[0];
  return order || null;
}

export async function createTransaction(cfg: ShopifyConfig, orderId: number, kind: 'capture' | 'void', amount?: string) {
  const payload: any = { transaction: { kind } };
  if (amount) payload.transaction.amount = amount;
  const { res, body } = await shopifyFetch(cfg, `/orders/${orderId}/transactions.json`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    return serverError(`Shopify transaction failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return new Response(JSON.stringify({ ok: true, transaction: body.transaction }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function setOrderNote(cfg: ShopifyConfig, orderId: number, note: string) {
  const { res, body } = await shopifyFetch(cfg, `/orders/${orderId}.json`, {
    method: 'PUT',
    body: JSON.stringify({ order: { id: orderId, note } }),
  });
  if (!res.ok) return badRequest(`Shopify setOrderNote failed: ${res.status} ${JSON.stringify(body)}`);
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}

/** Appends to the order merchant note so prior poster-approval history is kept. */
export async function appendOrderNote(cfg: ShopifyConfig, orderId: number, addition: string) {
  const { res, body } = await shopifyFetch(cfg, `/orders/${orderId}.json?fields=id,note`, { method: 'GET' });
  if (!res.ok) throw new Error(`Shopify read order note failed: ${res.status} ${JSON.stringify(body)}`);
  const prev = String((body as { order?: { note?: string } }).order?.note || '').trim();
  const stamp = new Date().toISOString();
  const block = `[Poster approval — ${stamp}]\n${addition}`;
  const next = prev ? `${prev}\n\n${block}` : block;
  const put = await shopifyFetch(cfg, `/orders/${orderId}.json`, {
    method: 'PUT',
    body: JSON.stringify({ order: { id: orderId, note: next } }),
  });
  if (!put.res.ok) throw new Error(`Shopify append order note failed: ${put.res.status} ${JSON.stringify(put.body)}`);
}

