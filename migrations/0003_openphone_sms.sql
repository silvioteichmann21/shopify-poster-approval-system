-- OpenPhone SMS automation state

CREATE TABLE IF NOT EXISTS sms_opt_outs (
  phone_e164 TEXT PRIMARY KEY,
  opted_out_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sms_leads (
  id TEXT PRIMARY KEY,
  phone_e164 TEXT NOT NULL,
  first_name TEXT,
  year TEXT,
  make TEXT,
  model TEXT,
  source TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sms_leads_phone_idx ON sms_leads(phone_e164);

