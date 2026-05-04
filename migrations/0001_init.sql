-- D1 schema for poster approvals

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,                 -- token id (unguessable)
  order_id INTEGER NOT NULL,           -- Shopify order ID (numeric)
  order_name TEXT,                     -- Shopify order name, e.g. "#4821"
  customer_email TEXT,                 -- cached for convenience
  poster_title TEXT,                   -- e.g. "2020 Dodge Challenger"
  preview_image_url TEXT,              -- hosted image URL
  status TEXT NOT NULL,                -- pending_preview | preview_ready | approved | edits_requested | declined
  edit_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  acted_at TEXT
);

CREATE INDEX IF NOT EXISTS approvals_order_id_idx ON approvals(order_id);
CREATE INDEX IF NOT EXISTS approvals_status_idx ON approvals(status);

