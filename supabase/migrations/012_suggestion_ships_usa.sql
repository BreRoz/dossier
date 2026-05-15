-- Add a ships-to-USA confirmation flag to store suggestions.
-- The /suggest form requires the user to confirm the retailer ships to the
-- USA before submitting; storing it gives the admin reviewer that signal
-- without having to check each one manually.

ALTER TABLE store_suggestions
  ADD COLUMN IF NOT EXISTS ships_usa boolean NOT NULL DEFAULT false;
