-- Brand directory, moved from Google Sheets into Supabase.
--
-- Why: the sheet hits API quotas, has no schema enforcement, and can't be
-- edited from the admin UI or written to by the ingest cron. Owning the
-- table here means one source of truth and lets us attach rich metadata
-- (multi-select categories using the new 61-slug taxonomy, sub-types,
-- price tier, affiliate IDs) that the LLM and ranker can use.

CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT NOT NULL,
  -- References the new categories.slug taxonomy. Plural because most
  -- retailers cross multiple buckets (Nordstrom → clothing + shoes +
  -- beauty). Stored as TEXT[] rather than a join table to keep admin
  -- UI editing trivial.
  categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- Free-form sub-classifications below the category level. "denim",
  -- "cashmere", "fast food", etc. The LLM can use these as hints when
  -- routing deals to watchlists.
  sub_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- '$' | '$$' | '$$$' | '$$$$' (nullable for unknown)
  price_tier TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- 'All Ages' | 'Teen' | '20s' | '30s' | etc. Free text for now.
  age_group TEXT,
  -- Empty until you sign up for the affiliate network; the rewriter
  -- code path can fall back to the bare website if this is null.
  affiliate_id TEXT,
  date_added DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive unique on website so re-seeding the same sheet twice
-- doesn't create duplicates, and so admin form can use INSERT … ON
-- CONFLICT to upsert.
CREATE UNIQUE INDEX IF NOT EXISTS stores_website_lower_idx
  ON stores(LOWER(website));

CREATE INDEX IF NOT EXISTS stores_name_lower_idx
  ON stores(LOWER(name));

CREATE INDEX IF NOT EXISTS stores_active_idx
  ON stores(is_active);

CREATE INDEX IF NOT EXISTS stores_categories_gin_idx
  ON stores USING GIN (categories);

-- updated_at auto-bump on every UPDATE
CREATE OR REPLACE FUNCTION update_stores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stores_updated_at_trigger ON stores;
CREATE TRIGGER stores_updated_at_trigger
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_stores_updated_at();
