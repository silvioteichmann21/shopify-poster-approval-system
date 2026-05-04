-- OAuth token storage (for Dev Dashboard / public app flow)

CREATE TABLE IF NOT EXISTS shops (
  shop TEXT PRIMARY KEY,         -- *.myshopify.com
  access_token TEXT NOT NULL,
  installed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS oauth_states_created_at_idx ON oauth_states(created_at);

