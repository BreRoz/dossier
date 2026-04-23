-- Store preferences: paid users can opt-out of individual retailers
CREATE TABLE IF NOT EXISTS subscriber_store_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id uuid REFERENCES subscribers(id) ON DELETE CASCADE NOT NULL,
  retailer text NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(subscriber_id, retailer)
);

-- Retailer scan log: tracks every sender scanned, with or without deals
-- Powers the "zero-deal senders" admin view
CREATE TABLE IF NOT EXISTS retailer_scan_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  week_of date NOT NULL,
  retailer text NOT NULL,
  sender_email text,
  emails_processed int DEFAULT 1 NOT NULL,
  deals_extracted int DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(week_of, retailer)
);

-- Allow 20% as a minimum discount (expand existing check constraint)
ALTER TABLE subscribers DROP CONSTRAINT IF EXISTS subscribers_min_discount_check;
ALTER TABLE subscribers ADD CONSTRAINT subscribers_min_discount_check
  CHECK (min_discount IN (20, 30, 40, 50));
