-- Migration 003: spend_tier_filter for all subscribers

ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS spend_tier_filter TEXT[] NOT NULL DEFAULT ARRAY['$','$$','$$$','$$$$'];
