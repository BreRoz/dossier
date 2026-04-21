-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Subscribers
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  zip_code TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'paid')),
  send_day TEXT NOT NULL DEFAULT 'thursday' CHECK (
    send_day IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')
  ),
  min_discount INTEGER NOT NULL DEFAULT 40 CHECK (min_discount IN (30, 40, 50)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Category preferences per subscriber
CREATE TABLE IF NOT EXISTS subscriber_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(subscriber_id, category)
);

-- Deal type preferences per subscriber
CREATE TABLE IF NOT EXISTS subscriber_deal_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  deal_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(subscriber_id, deal_type)
);

-- Deals extracted from Gmail
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer TEXT NOT NULL,
  description TEXT NOT NULL,
  percent_off INTEGER,
  deal_type TEXT NOT NULL DEFAULT 'percent-off',
  promo_code TEXT,
  expiration_date DATE,
  original_link TEXT NOT NULL,
  affiliate_link TEXT,
  categories TEXT[] NOT NULL DEFAULT '{}',
  week_of DATE NOT NULL,
  source_email_id TEXT,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS deals_week_of_idx ON deals(week_of);
CREATE INDEX IF NOT EXISTS deals_source_email_id_idx ON deals(source_email_id);

-- Weekly editions metadata (for archive)
CREATE TABLE IF NOT EXISTS editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of DATE NOT NULL UNIQUE,
  issue_number INTEGER,
  emails_scanned INTEGER NOT NULL DEFAULT 0,
  deals_found INTEGER NOT NULL DEFAULT 0,
  retailers_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Log of sent emails
CREATE TABLE IF NOT EXISTS sent_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  deals_shown INTEGER NOT NULL DEFAULT 0,
  deals_locked INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subscriber_id, edition_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscribers_updated_at
  BEFORE UPDATE ON subscribers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriber_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriber_deal_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;

-- Subscribers can read/update their own record
CREATE POLICY "subscribers_own" ON subscribers
  FOR ALL USING (auth.jwt() ->> 'email' = email);

-- Subscribers can manage their own preferences
CREATE POLICY "categories_own" ON subscriber_categories
  FOR ALL USING (
    subscriber_id IN (
      SELECT id FROM subscribers WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "deal_types_own" ON subscriber_deal_types
  FOR ALL USING (
    subscriber_id IN (
      SELECT id FROM subscribers WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Deals are publicly readable
CREATE POLICY "deals_public_read" ON deals
  FOR SELECT USING (true);

-- Editions are publicly readable
CREATE POLICY "editions_public_read" ON editions
  FOR SELECT USING (true);

-- Service role bypasses RLS (used in API routes)
