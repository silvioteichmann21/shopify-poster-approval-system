-- Poster reservation leads (Page 2 submit → internal portal → customer preview link)

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  first_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  phone_country TEXT,
  year TEXT,
  make TEXT,
  model TEXT,
  color TEXT,
  finish TEXT,
  size TEXT,
  design TEXT,
  special_notes TEXT,
  upload_choice TEXT,
  upload_photo_file_name TEXT,
  variant_id TEXT,
  variant_title TEXT,
  product_title TEXT,
  product_handle TEXT,
  product_url TEXT,
  price_display TEXT,
  compare_at_display TEXT,
  preview_image_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  preview_ready_at TEXT
);

CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at);
