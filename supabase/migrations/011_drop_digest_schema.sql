-- Phase 6 cleanup: drop the digest-era schema.
--
-- All routes / code that read these are gone:
--   - app/api/cron/send (Thursday weekly digest)
--   - app/api/admin/run-send, send-preview
--   - app/api/preferences (replaced by /api/account)
--   - app/api/stores/toggle (per-store retailer mode)
--   - app/stores page (browse-all-stores UI)
--   - lib/emailGenerator.ts (the weekly digest template)
--   - subscriber_categories/_deal_types/_retailers seeding in /api/subscribe
--
-- After this, the only subscriber-preference table that exists is
-- subscriber_watches (from migration 010), and the subscribers table
-- contains only fields the watchlist model uses.
--
-- Run this AFTER deploying the matching code commit so no live request
-- tries to read a column we're about to drop.

DROP TABLE IF EXISTS subscriber_categories CASCADE;
DROP TABLE IF EXISTS subscriber_deal_types CASCADE;
DROP TABLE IF EXISTS subscriber_retailers CASCADE;

ALTER TABLE subscribers DROP COLUMN IF EXISTS send_day;
ALTER TABLE subscribers DROP COLUMN IF EXISTS min_discount;
ALTER TABLE subscribers DROP COLUMN IF EXISTS subscription_mode;
ALTER TABLE subscribers DROP COLUMN IF EXISTS gender_filter;
ALTER TABLE subscribers DROP COLUMN IF EXISTS spend_tier_filter;
