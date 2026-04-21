-- Migration 002: subscription_mode, gender_filter, subscriber_retailers, deals.gender

-- subscription_mode on subscribers (default 'category' for backwards compat)
ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS subscription_mode TEXT NOT NULL DEFAULT 'category'
  CHECK (subscription_mode IN ('category', 'retailer'));

-- gender_filter on subscribers (default all genders)
ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS gender_filter TEXT[] NOT NULL DEFAULT ARRAY['men','women','unisex'];

-- gender tagging on deals (default all genders for existing rows)
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS gender TEXT[] NOT NULL DEFAULT ARRAY['men','women','unisex'];

-- Individual retailer subscriptions (paid mode)
CREATE TABLE IF NOT EXISTS subscriber_retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  retailer TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(subscriber_id, retailer)
);

CREATE INDEX IF NOT EXISTS subscriber_retailers_sub_idx ON subscriber_retailers(subscriber_id);

ALTER TABLE subscriber_retailers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "retailers_own" ON subscriber_retailers
  FOR ALL USING (
    subscriber_id IN (
      SELECT id FROM subscribers WHERE email = auth.jwt() ->> 'email'
    )
  );
