-- Singleton state row for the ingest cron.
--
-- Tracks the highest IMAP UID we've successfully processed from INBOX so the
-- next run can fetch UID > last_uid instead of re-walking a 24-hour window
-- and deduping. UIDVALIDITY is captured alongside: if Gmail ever resets it
-- (mailbox recreated, server-side reorg), we detect the mismatch and fall
-- back to the date-windowed path for one run, then resume cursor-based
-- fetching.
--
-- The CHECK + DEFAULT on `id` enforces this is a single-row table; you can
-- only INSERT id='singleton', and ON CONFLICT (id) DO UPDATE is the only
-- write path the app uses.

CREATE TABLE IF NOT EXISTS ingest_state (
  id text PRIMARY KEY DEFAULT 'singleton' CHECK (id = 'singleton'),
  uid_validity bigint,
  last_uid bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO ingest_state (id) VALUES ('singleton')
  ON CONFLICT (id) DO NOTHING;
