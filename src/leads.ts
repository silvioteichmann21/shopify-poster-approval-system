import { nowIso } from './util';

export type LeadStatus = 'new' | 'preview_ready' | 'sent' | 'ordered';

export type LeadRow = {
  id: string;
  status: LeadStatus;
  first_name: string;
  phone_number: string;
  phone_country: string | null;
  year: string | null;
  make: string | null;
  model: string | null;
  color: string | null;
  finish: string | null;
  size: string | null;
  design: string | null;
  special_notes: string | null;
  upload_choice: string | null;
  upload_photo_file_name: string | null;
  variant_id: string | null;
  variant_title: string | null;
  product_title: string | null;
  product_handle: string | null;
  product_url: string | null;
  price_display: string | null;
  compare_at_display: string | null;
  preview_image_url: string | null;
  created_at: string;
  updated_at: string;
  preview_ready_at: string | null;
};

export type LeadInsertPayload = {
  firstName?: string;
  phoneNumber?: string;
  phoneCountry?: string;
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
  productTitle?: string;
  productHandle?: string;
  productUrl?: string;
  priceDisplay?: string;
  compareAtDisplay?: string;
};

function safeStr(v: unknown) {
  return typeof v === 'string' ? v.trim() : '';
}

function variantIdToString(v: number | string | null | undefined) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  return /^[0-9]+$/.test(s) ? s : null;
}

export function leadVehicle(row: LeadRow) {
  return [row.year, row.make, row.model].filter(Boolean).join(' ');
}

/** Reject customer preview page links mistakenly pasted as the image URL. */
export function normalizePreviewImageUrl(url: string) {
  return url.trim().replace(/#+$/, '');
}

export function isValidPreviewImageUrl(url: string): { ok: true } | { ok: false; error: string } {
  const u = normalizePreviewImageUrl(url);
  if (!u) return { ok: false, error: 'Missing preview image URL.' };
  if (/\/pages\/poster-preview/i.test(u) || /poster-preview\?token=/i.test(u)) {
    return {
      ok: false,
      error:
        'Paste the Shopify Files image link (https://cdn.shopify.com/s/files/...), not the customer preview page link.',
    };
  }
  try {
    const parsed = new URL(u);
    if (/\/preview-images\//i.test(parsed.pathname)) {
      return { ok: true };
    }
    if (/cdn\.shopify\.com$/i.test(parsed.hostname) && /\/s\/files\//i.test(parsed.pathname)) {
      return { ok: true };
    }
    if (/\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test(parsed.pathname)) {
      return { ok: true };
    }
    return {
      ok: false,
      error: 'Upload the preview image in the portal, or use a direct image URL.',
    };
  } catch {
    return { ok: false, error: 'Invalid image URL.' };
  }
}

export async function updateLeadStatus(db: D1Database, id: string, status: LeadStatus) {
  const now = nowIso();
  await db
    .prepare('UPDATE leads SET status = ?2, updated_at = ?3 WHERE id = ?1')
    .bind(id, status, now)
    .run();
}

export async function insertLead(db: D1Database, id: string, payload: LeadInsertPayload) {
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO leads (
        id, status, first_name, phone_number, phone_country,
        year, make, model, color, finish, size, design, special_notes,
        upload_choice, upload_photo_file_name,
        variant_id, variant_title, product_title, product_handle, product_url,
        price_display, compare_at_display, preview_image_url,
        created_at, updated_at, preview_ready_at
      ) VALUES (
        ?1, 'new', ?2, ?3, ?4,
        ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12,
        ?13, ?14,
        ?15, ?16, ?17, ?18, ?19,
        ?20, ?21, NULL,
        ?22, ?23, NULL
      )`
    )
    .bind(
      id,
      safeStr(payload.firstName),
      safeStr(payload.phoneNumber),
      safeStr(payload.phoneCountry) || null,
      safeStr(payload.year) || null,
      safeStr(payload.make) || null,
      safeStr(payload.model) || null,
      safeStr(payload.color) || null,
      safeStr(payload.finish) || null,
      safeStr(payload.size) || null,
      safeStr(payload.design) || null,
      safeStr(payload.specialNotes) || null,
      safeStr(payload.uploadChoice) || null,
      typeof payload.uploadPhotoFileName === 'string' ? payload.uploadPhotoFileName : null,
      variantIdToString(payload.variantId),
      safeStr(payload.variantTitle) || null,
      safeStr(payload.productTitle) || null,
      safeStr(payload.productHandle) || null,
      safeStr(payload.productUrl) || null,
      safeStr(payload.priceDisplay) || null,
      safeStr(payload.compareAtDisplay) || null,
      now,
      now
    )
    .run();
}

export async function getLead(db: D1Database, id: string): Promise<LeadRow | null> {
  const row = await db.prepare('SELECT * FROM leads WHERE id = ?1').bind(id).first<LeadRow>();
  return row || null;
}

export async function listLeads(db: D1Database, limit = 100): Promise<LeadRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT ?1')
    .bind(limit)
    .all<LeadRow>();
  return results || [];
}

export async function updateLeadPreview(db: D1Database, id: string, preview_image_url: string, status: LeadStatus = 'preview_ready') {
  const now = nowIso();
  const normalized = normalizePreviewImageUrl(preview_image_url);
  await db
    .prepare(
      `UPDATE leads SET
        preview_image_url = ?2,
        status = ?3,
        updated_at = ?4,
        preview_ready_at = COALESCE(preview_ready_at, ?4)
       WHERE id = ?1`
    )
    .bind(id, normalized, status, now)
    .run();
}

export function leadToPortalJson(row: LeadRow, customer_preview_url: string) {
  return {
    id: row.id,
    status: row.status,
    first_name: row.first_name,
    phone_number: row.phone_number,
    phone_country: row.phone_country,
    vehicle: leadVehicle(row),
    year: row.year,
    make: row.make,
    model: row.model,
    color: row.color,
    finish: row.finish,
    size: row.size,
    design: row.design,
    special_notes: row.special_notes,
    upload_choice: row.upload_choice,
    upload_photo_file_name: row.upload_photo_file_name,
    variant_id: row.variant_id,
    variant_title: row.variant_title,
    product_title: row.product_title,
    product_url: row.product_url,
    price_display: row.price_display,
    compare_at_display: row.compare_at_display,
    preview_image_url: row.preview_image_url,
    customer_preview_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    preview_ready_at: row.preview_ready_at,
  };
}

export function leadToPublicPreview(row: LeadRow) {
  const imageUrl = row.preview_image_url ? normalizePreviewImageUrl(row.preview_image_url) : '';
  const imageOk = imageUrl ? isValidPreviewImageUrl(imageUrl).ok : false;
  const ready = row.status === 'preview_ready' && imageOk && Boolean(row.variant_id);
  return {
    ok: true,
    ready,
    status: row.status,
    preview_image_url: imageOk ? imageUrl : null,
    variant_id: row.variant_id,
    vehicle: leadVehicle(row),
    finish: row.finish,
    size: row.size,
    design: row.design,
    message: ready
      ? null
      : row.preview_image_url && !imageOk
        ? 'Preview image link is invalid. Please contact us for a corrected link.'
        : 'Your poster preview is being prepared. We will send you a link soon.',
  };
}
