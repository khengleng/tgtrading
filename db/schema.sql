CREATE TABLE IF NOT EXISTS local_quotes (
  id UUID PRIMARY KEY,
  owner_telegram_id TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  quote_side TEXT NOT NULL CHECK (quote_side IN ('buy', 'sell')),
  price_usd NUMERIC(14,2) NOT NULL CHECK (price_usd > 0),
  tael_unit TEXT NOT NULL,
  source_reference TEXT NOT NULL,
  source_timestamp TIMESTAMPTZ NOT NULL,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('indicative', 'verified')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS local_quotes_owner_created_idx ON local_quotes (owner_telegram_id, created_at DESC);

CREATE TABLE IF NOT EXISTS gold_trades (
  id UUID PRIMARY KEY,
  owner_telegram_id TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  quote_id UUID REFERENCES local_quotes(id),
  tael_quantity INTEGER NOT NULL CHECK (tael_quantity > 0),
  allocation_usd NUMERIC(14,2) NOT NULL CHECK (allocation_usd > 0),
  entry_price_usd NUMERIC(14,2) NOT NULL CHECK (entry_price_usd > 0),
  entry_timestamp TIMESTAMPTZ NOT NULL,
  mandatory_close_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'closed', 'unresolved')),
  closing_price_usd NUMERIC(14,2),
  close_timestamp TIMESTAMPTZ,
  close_reference TEXT,
  realized_pnl_usd NUMERIC(14,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((status = 'active' AND closing_price_usd IS NULL AND close_timestamp IS NULL) OR status <> 'active')
);

CREATE INDEX IF NOT EXISTS gold_trades_owner_status_idx ON gold_trades (owner_telegram_id, status, created_at DESC);
