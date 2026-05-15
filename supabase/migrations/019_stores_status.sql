-- Richer state machine for stores.
--
-- is_active was a simple boolean (visible / hidden), which couldn't
-- distinguish between:
--   - "we haven't seen their first email yet" → pending
--   - "they don't have a public promo email list" → no_email
--   - "we don't want to track them" → declined
--
-- Adding a status column lets the admin UI surface that distinction and
-- lets the ingest auto-activation logic know NOT to flip no_email or
-- declined rows even if we somehow receive a stray email matching them.
--
-- Allowed values (enforced by the app, not the DB — staying flexible):
--   'active'   — tracked and visible
--   'pending'  — in directory, awaiting first email (auto-activates)
--   'no_email' — confirmed no promotional email list available
--   'declined' — actively rejected
--
-- is_active stays around as a quick visibility flag — true iff status =
-- 'active'. Maintained by the app layer alongside status updates.

ALTER TABLE stores ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Backfill: anything currently active becomes 'active', everything else
-- defaults to 'pending' which is the right state for the legacy
-- is_active=false rows imported earlier.
UPDATE stores SET status = 'active' WHERE is_active = true;

CREATE INDEX IF NOT EXISTS stores_status_idx ON stores(status);
