/**
 * Klaviyo Events API — creates events tied to a profile (email) so Flows can trigger reliably.
 * Docs: https://developers.klaviyo.com/en/reference/create_event
 */

export type KlaviyoSendResult = { ok: true } | { ok: false; status: number; detail: string };

export async function klaviyoCreateEvent(opts: {
  apiKey: string;
  metricName: string;
  properties: Record<string, unknown>;
  profileEmail: string;
  /** Optional dedupe key (e.g. order_id + action) */
  uniqueId?: string;
}): Promise<KlaviyoSendResult> {
  const email = opts.profileEmail.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return { ok: false, status: 400, detail: 'Invalid profile email for Klaviyo' };
  }

  const attributes: Record<string, unknown> = {
    properties: opts.properties,
    metric: {
      data: {
        type: 'metric',
        attributes: { name: opts.metricName },
      },
    },
    profile: {
      data: {
        type: 'profile',
        attributes: { email },
      },
    },
  };
  if (opts.uniqueId) attributes.unique_id = opts.uniqueId;

  const res = await fetch('https://a.klaviyo.com/api/events/', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Klaviyo-API-Key ${opts.apiKey}`,
      revision: '2024-10-15',
    },
    body: JSON.stringify({
      data: {
        type: 'event',
        attributes,
      },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, detail: text.slice(0, 500) };
  }
  return { ok: true };
}

export function isValidKlaviyoProfileEmail(email: string | null | undefined): email is string {
  if (!email || typeof email !== 'string') return false;
  const t = email.trim();
  return t.includes('@') && t.length > 3;
}

/** Customer-facing metrics — use in Klaviyo flows to email the buyer. */
export async function klaviyoNotifyCustomer(
  apiKey: string | undefined,
  metricName: string,
  customerEmail: string | null | undefined,
  properties: Record<string, unknown>,
  uniqueId?: string
): Promise<KlaviyoSendResult | null> {
  if (!apiKey || !isValidKlaviyoProfileEmail(customerEmail)) return null;
  return klaviyoCreateEvent({
    apiKey,
    metricName,
    properties,
    profileEmail: customerEmail.trim(),
    uniqueId,
  });
}

/** Admin metrics — same properties; profile is your notify email. Create flows that email you. */
export async function klaviyoNotifyAdmin(
  apiKey: string | undefined,
  adminMetricName: string,
  adminEmail: string | null | undefined,
  properties: Record<string, unknown>,
  uniqueId?: string
): Promise<KlaviyoSendResult | null> {
  if (!apiKey || !isValidKlaviyoProfileEmail(adminEmail)) return null;
  return klaviyoCreateEvent({
    apiKey,
    metricName: adminMetricName,
    properties,
    profileEmail: adminEmail.trim(),
    uniqueId,
  });
}
