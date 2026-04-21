-- Migration 004: rename categories to match new taxonomy

-- ── subscriber_categories ────────────────────────────────────────────────────
-- Merge both fashion types + athletic → fashion
UPDATE subscriber_categories SET category = 'fashion'
  WHERE category IN ('premium-fashion', 'everyday-fashion', 'athletic');

-- tools-yard → tools
UPDATE subscriber_categories SET category = 'tools'
  WHERE category = 'tools-yard';

-- fast-food → restaurants (merge)
UPDATE subscriber_categories SET category = 'restaurants'
  WHERE category = 'fast-food';

-- Deduplicate after merges (keep the enabled=true row if both exist)
DELETE FROM subscriber_categories sc1
  USING subscriber_categories sc2
  WHERE sc1.subscriber_id = sc2.subscriber_id
    AND sc1.category = sc2.category
    AND sc1.id > sc2.id;

-- Seed new categories (accessories, entertainment, shoes) for all existing subscribers
-- Default to false so existing users aren't surprised
INSERT INTO subscriber_categories (subscriber_id, category, enabled)
  SELECT id, 'accessories',   false FROM subscribers ON CONFLICT (subscriber_id, category) DO NOTHING;
INSERT INTO subscriber_categories (subscriber_id, category, enabled)
  SELECT id, 'entertainment', false FROM subscribers ON CONFLICT (subscriber_id, category) DO NOTHING;
INSERT INTO subscriber_categories (subscriber_id, category, enabled)
  SELECT id, 'shoes',         false FROM subscribers ON CONFLICT (subscriber_id, category) DO NOTHING;

-- ── deals.categories array ───────────────────────────────────────────────────
UPDATE deals SET categories = array_replace(categories, 'premium-fashion', 'fashion');
UPDATE deals SET categories = array_replace(categories, 'everyday-fashion', 'fashion');
UPDATE deals SET categories = array_replace(categories, 'athletic',         'fashion');
UPDATE deals SET categories = array_replace(categories, 'tools-yard',       'tools');
UPDATE deals SET categories = array_replace(categories, 'fast-food',        'restaurants');

-- Remove duplicate values inside each categories array that may result from merges
UPDATE deals
  SET categories = ARRAY(SELECT DISTINCT unnest(categories) ORDER BY 1)
  WHERE 'fashion' = ANY(categories)
     OR 'tools'   = ANY(categories)
     OR 'restaurants' = ANY(categories);
