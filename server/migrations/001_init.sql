PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  wecom_external_userid TEXT UNIQUE,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS diagnoses (
  id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id),
  stage TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  token TEXT NOT NULL UNIQUE,
  wecom_status TEXT NOT NULL DEFAULT 'unbound',
  wecom_external_userid TEXT,
  wecom_qr_url TEXT,
  source TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  report_started_at TEXT,
  report_ready_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_diagnoses_user ON diagnoses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagnoses_status ON diagnoses(status);

CREATE TABLE IF NOT EXISTS reports (
  diagnosis_id TEXT PRIMARY KEY REFERENCES diagnoses(id) ON DELETE CASCADE,
  preview_json TEXT NOT NULL,
  full_json TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  kb_version TEXT NOT NULL,
  model TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_jobs (
  diagnosis_id TEXT PRIMARY KEY REFERENCES diagnoses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  run_after TEXT NOT NULL,
  locked_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_run_after ON report_jobs(status, run_after);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  diagnosis_id TEXT NOT NULL REFERENCES diagnoses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CNY',
  provider TEXT NOT NULL,
  provider_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  code_url TEXT,
  paid_at TEXT,
  raw_callback_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_diagnosis ON orders(diagnosis_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_provider_order
  ON orders(provider, provider_order_id)
  WHERE provider_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS kb_documents (
  id TEXT PRIMARY KEY,
  layer TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'all',
  market TEXT NOT NULL DEFAULT 'all',
  platform TEXT NOT NULL DEFAULT 'all',
  stage TEXT NOT NULL DEFAULT 'all',
  topic TEXT NOT NULL DEFAULT 'general',
  source_name TEXT,
  source_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'public',
  updated_at TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'medium',
  tags_json TEXT NOT NULL DEFAULT '[]',
  stale INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_kb_filters
  ON kb_documents(stage, industry, market, platform);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  diagnosis_id TEXT,
  type TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_type_time ON events(type, created_at DESC);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
