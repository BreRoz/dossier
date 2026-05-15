-- Drop columns we decided not to surface in the stores admin UI.
--
-- ships_usa: we don't need it as structured data — the /suggest form's
--            "must ship to the US" notice is enough of a soft signal.
-- hq:        purely informational, never queried.
-- notes:     internal admin notes — moved to a future free-form audit
--            log if we ever need them, not part of the brand record.
--
-- Safe to re-run; DROP COLUMN IF EXISTS is idempotent.

ALTER TABLE stores DROP COLUMN IF EXISTS ships_usa;
ALTER TABLE stores DROP COLUMN IF EXISTS hq;
ALTER TABLE stores DROP COLUMN IF EXISTS notes;
