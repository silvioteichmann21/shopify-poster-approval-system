export type OpenPhoneSendMessageInput = {
    apiKey: string;
    fromNumberId: string;
    toE164: string;
    content: string;
  };
  
  export async function openPhoneSendMessage(input: OpenPhoneSendMessageInput): Promise<{ ok: true; id: string } | { ok: false; status: number; detail: unknown }> {
    // Quo/OpenPhone public API expects the raw API key in the Authorization header (not "Bearer <key>").
    // See: https://www.openphone.com/docs/api-reference/authentication
    const auth = input.apiKey.trim();
    const res = await fetch('https://api.openphone.com/v1/messages', {
      method: 'POST',
      headers: {
        authorization: auth,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        content: input.content,
        from: input.fromNumberId,
        to: [input.toE164],
      }),
    });
  
    const body = (await res.json().catch(() => null)) as any;
    if (!res.ok) return { ok: false, status: res.status, detail: body };
  
    const id = body?.data?.id || body?.id || '';
    if (!id) return { ok: false, status: 502, detail: { error: 'OpenPhone response missing id', body } };
    return { ok: true, id };
  }
  
  export function normalizeToE164(raw: string): string | null {
    const s = String(raw || '').trim();
    if (!s) return null;
    // If already +E164, keep.
    if (/^\+[1-9][0-9]{7,15}$/.test(s)) return s;
    // Remove non-digits, then try US default if 10 digits.
    const digits = s.replace(/[^\d]/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length >= 11 && digits.length <= 16 && digits.startsWith('1')) return `+${digits}`;
    return null;
  }
  
  export function buildSms1(firstName: string, year: string, make: string, model: string): string {
    const name = firstName?.trim() || 'there';
    const vehicle = [year, make, model].map((s) => (s || '').trim()).filter(Boolean).join(' ');
    const v = vehicle ? `Your ${vehicle} is currently in the works!` : 'Your poster is currently in the works!';
    return `Hey ${name}, it’s Chisom from Social Orbit Studios. ${v} Please confirm that this is the proper number to send it to. Reply STOP to unsubscribe.`;
  }
  