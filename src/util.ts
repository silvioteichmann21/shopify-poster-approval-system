export function nowIso() {
  return new Date().toISOString();
}

export function json<T>(data: T, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
    ...init,
  });
}

export function badRequest(message: string) {
  return json({ ok: false, error: message }, { status: 400 });
}

export function unauthorized(message = 'Unauthorized') {
  return json({ ok: false, error: message }, { status: 401 });
}

export function notFound(message = 'Not found') {
  return json({ ok: false, error: message }, { status: 404 });
}

export function serverError(message = 'Server error') {
  return json({ ok: false, error: message }, { status: 500 });
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function constantTimeEquals(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function requireAdmin(req: Request, env: { ADMIN_PASSWORD?: string }) {
  const expected = (env.ADMIN_PASSWORD ?? '').trim();
  if (!expected) return false;
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) return false;
  const raw = atob(auth.slice('Basic '.length));
  const idx = raw.indexOf(':');
  const pass = idx >= 0 ? raw.slice(idx + 1) : '';
  return constantTimeEquals(pass, expected);
}

export function assertValidShop(shop: string) {
  // Minimal validation: block obvious injection / non-shop domains.
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop)) {
    throw new Error('Invalid shop domain. Use the *.myshopify.com domain.');
  }
}

export async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  const arr = Array.from(new Uint8Array(sig));
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function buildShopifyHmacMessage(params: URLSearchParams) {
  // Shopify HMAC base string is query params (excluding hmac/signature) sorted lexicographically, joined as k=v&...
  const pairs: string[] = [];
  for (const [k, v] of params.entries()) {
    if (k === 'hmac' || k === 'signature') continue;
    pairs.push(`${k}=${v}`);
  }
  pairs.sort((a, b) => a.localeCompare(b));
  return pairs.join('&');
}

