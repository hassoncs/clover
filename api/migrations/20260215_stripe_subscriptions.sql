-- Stripe subscription support for web-based Pro subscriptions
-- See: docs/product/ECONOMIC_VISION.md

-- Extend users table with subscription fields
ALTER TABLE users ADD COLUMN pro_subscription_until INTEGER;  -- unix ms, NULL if not subscribed
ALTER TABLE users ADD COLUMN pro_source TEXT;                  -- 'stripe' | 'revenuecat'
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;

-- Stripe subscription lifecycle tracking
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id),
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,                -- 'active', 'canceled', 'past_due', 'incomplete', 'trialing'
  price_id TEXT,
  current_period_end INTEGER,          -- unix ms
  cancel_at_period_end INTEGER DEFAULT 0,
  latest_invoice_id TEXT,
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  updated_at INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE INDEX idx_stripe_subs_user ON stripe_subscriptions(user_id);
CREATE INDEX idx_stripe_subs_customer ON stripe_subscriptions(stripe_customer_id);

-- Webhook event idempotency table
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at INTEGER DEFAULT (unixepoch() * 1000)
);
