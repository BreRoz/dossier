-- Weekly Thursday email — opt-in flag and last-sent timestamp.
--
-- weekly_email_enabled is the user-facing toggle. Defaults to true for
-- everyone so existing subscribers automatically opt in; they can switch
-- it off from /preferences. The on-demand "send me deals now" button is
-- unaffected by this flag — that's always available.
--
-- last_weekly_email_at is the cron's dedup signal — we only send a weekly
-- to a given subscriber once per 6+ day window, so a re-run of the cron
-- (manual or accidental) doesn't double-send.

ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS weekly_email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_weekly_email_at timestamptz;

CREATE INDEX IF NOT EXISTS subscribers_weekly_email_enabled_idx
  ON subscribers(weekly_email_enabled, last_weekly_email_at);
