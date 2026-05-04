import type { Env as WorkerEnv } from './worker_env';
import { buildSms1, normalizeToE164, openPhoneSendMessage } from './openphone';

type LeadPayload = {
  firstName: string;
  phoneNumber: string;
  year: string;
  make: string;
  model: string;
};

type State = {
  phone_e164: string;
  first_name: string;
  year: string;
  make: string;
  model: string;
  sms1_sent_at?: string;
  sms1_openphone_id?: string;
  pending?: 'sms1' | null;
  last_attempt_at?: string;
  last_error?: unknown;
};

export class SmsAutomation {
  private state: DurableObjectStorage;
  private env: WorkerEnv;

  constructor(state: DurableObjectState, env: WorkerEnv) {
    this.state = state.storage;
    this.env = env;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const action = url.pathname.replace(/^\//, '');
    if (req.method === 'GET' && action === 'status') {
      const s = await this.getState();
      return new Response(JSON.stringify({ ok: true, state: s }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const body = (await req.json().catch(() => null)) as any;
    if (!body) return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers: { 'content-type': 'application/json' } });

    if (action === 'schedule-sms1') {
      return this.scheduleSms1(body as LeadPayload);
    }
    return new Response('Not found', { status: 404 });
  }

  private async getState(): Promise<State | null> {
    return (await this.state.get<State>('state')) || null;
  }

  private async setState(s: State): Promise<void> {
    await this.state.put('state', s);
  }

  private async scheduleSms1(payload: LeadPayload): Promise<Response> {
    const phone_e164 = normalizeToE164(payload.phoneNumber);
    if (!phone_e164) return new Response(JSON.stringify({ ok: false, error: 'Invalid phone number' }), { status: 400 });

    const s: State = {
      phone_e164,
      first_name: payload.firstName || '',
      year: payload.year || '',
      make: payload.make || '',
      model: payload.model || '',
      pending: 'sms1',
    };
    await this.setState(s);
    // fire SMS1 in 10 seconds
    await this.state.setAlarm(Date.now() + 10_000);
    return new Response(JSON.stringify({ ok: true, scheduled: 'sms1', phone_e164 }), { status: 200 });
  }

  async alarm(): Promise<void> {
    const s = await this.getState();
    if (!s) return;

    const apiKey = (this.env.OPENPHONE_API_KEY || '').trim();
    const fromId = (this.env.OPENPHONE_FROM_NUMBER_ID || '').trim();
    if (!apiKey || !fromId) {
      // Misconfigured; do nothing but keep state.
      return;
    }

    if (s.pending === 'sms1') {
      s.last_attempt_at = new Date().toISOString();
      s.last_error = null;
      await this.setState(s);

      const content = buildSms1(s.first_name, s.year, s.make, s.model);
      const sent = await openPhoneSendMessage({ apiKey, fromNumberId: fromId, toE164: s.phone_e164, content });
      if (sent.ok) {
        s.sms1_openphone_id = sent.id;
        s.sms1_sent_at = new Date().toISOString();
        s.pending = null;
        await this.setState(s);
      } else {
        s.last_error = sent;
        await this.setState(s);
        // retry once in 30s
        await this.state.setAlarm(Date.now() + 30_000);
      }
      return;
    }
  }
}

