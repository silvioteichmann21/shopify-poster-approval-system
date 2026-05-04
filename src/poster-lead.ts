/**
 * Page 1 + Page 2 poster reservation: format body and send merchant email via Resend.
 */

export type PosterLeadRecord = Record<string, unknown>;

export function sanitizePosterLeadForEmail(data: PosterLeadRecord): PosterLeadRecord {
  const out: PosterLeadRecord = { ...data };
  const u = out.uploadPhotoDataUrl;
  if (typeof u === 'string' && u.length > 2500) {
    out.uploadPhotoDataUrl =
      '[Image omitted — file too large for email. Filename: ' +
      (typeof out.uploadPhotoFileName === 'string' ? out.uploadPhotoFileName : 'unknown') +
      '. Ask the customer to resend the photo.]';
  }
  return out;
}

export function formatPosterLeadPlainText(data: PosterLeadRecord): string {
  const d = sanitizePosterLeadForEmail(data);
  const lines = [
    'New poster inquiry (combined Page 1 + Page 2)',
    '',
    '--- Contact ---',
    'First name: ' + String(d.firstName ?? ''),
    'Phone (E.164): ' + String(d.phoneNumber ?? ''),
    'Phone country: ' + String(d.phoneCountry ?? ''),
    '',
    '--- Product ---',
    'Product: ' + String(d.productTitle ?? ''),
    'Handle: ' + String(d.productHandle ?? ''),
    'Product URL: ' + String(d.productUrl ?? ''),
    'Variant ID: ' + (d.variantId != null ? String(d.variantId) : ''),
    'Variant: ' + String(d.variantTitle ?? ''),
    'Price shown: ' + String(d.priceDisplay ?? ''),
    'Compare-at shown: ' + String(d.compareAtDisplay ?? ''),
    '',
    '--- Vehicle & options ---',
    'Year: ' + String(d.year ?? ''),
    'Make: ' + String(d.make ?? ''),
    'Model: ' + String(d.model ?? ''),
    'Color: ' + String(d.color ?? ''),
    'Finish: ' + String(d.finish ?? ''),
    'Size: ' + String(d.size ?? ''),
    'Design: ' + String(d.design ?? ''),
    'Upload photo: ' + String(d.uploadChoice ?? ''),
    'Photo filename: ' + String(d.uploadPhotoFileName ?? ''),
    'Special notes: ' + String(d.specialNotes ?? ''),
    '',
    '--- Technical ---',
    'Saved from product at: ' + String(d.savedAt ?? ''),
    'Step 2 submitted at: ' + String(d.step2SubmittedAt ?? ''),
    '',
    '--- JSON (sanitized) ---',
    JSON.stringify(d, null, 2),
  ];
  let body = lines.join('\n');
  const maxLen = 11000;
  if (body.length > maxLen) {
    body =
      body.slice(0, maxLen) +
      '\n\n[Truncated — message exceeded safe limit. Use phone/name to follow up.]';
  }
  return body;
}

export async function sendPosterLeadEmailResend(opts: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; status: number; detail: string }> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${opts.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, detail: text.slice(0, 800) };
  }
  return { ok: true };
}

export function parseAllowedPosterLeadOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function isPosterLeadOriginAllowed(origin: string | undefined, allowed: string[]): boolean {
  if (!origin || !allowed.length) return false;
  const o = origin.replace(/\/$/, '');
  return allowed.some((a) => o === a || o.startsWith(a + '/'));
}

export function posterLeadCorsHeaders(origin: string | undefined, allowed: string[]): Record<string, string> {
  const h: Record<string, string> = {
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type',
    'access-control-max-age': '86400',
  };
  if (origin && isPosterLeadOriginAllowed(origin, allowed)) {
    h['access-control-allow-origin'] = origin;
    h.vary = 'Origin';
  }
  return h;
}
