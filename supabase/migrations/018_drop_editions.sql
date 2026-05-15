-- Retire the weekly-digest "editions" model.
--
-- editions was the source-of-truth row for each Thursday's curated send.
-- It carried issue_number + cumulative stats (deals_found, retailers_count,
-- emails_scanned) and was referenced by sent_emails for deduplication.
--
-- The watchlist pivot replaced both:
--   - on-demand /api/deals/refresh uses subscriber_watches.last_email_sent_at
--   - the weekly retention email uses subscribers.last_weekly_email_at
--   - homepage stats now compute from a 30-day rolling window over deals
--     and processed_emails, no precomputed table required
--
-- Both tables are safe to drop. No remaining reader/writer in the app.

DROP TABLE IF EXISTS sent_emails;
DROP TABLE IF EXISTS editions;
