-- Phase 0 of the intent-driven rebuild — schema only, no app changes.
--
-- This migration adds the foundation for the new "what are you shopping for"
-- model. Existing weekly digest send still works; nothing here breaks the
-- live site. Subsequent phases (ingest tagging, on-demand send, watchlist UI)
-- build on top of these tables.

-- ── Categories: the authoritative list ─────────────────────────────────
-- Stored as data rather than a code enum so you can add new ones (e.g. when
-- new shopping niches show up) without a deploy. The LLM ingest prompt
-- reads this table at runtime so it always knows the current taxonomy.
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS categories_active_sort_idx
  ON categories(is_active, sort_order);

-- ── Subscriber watchlists ──────────────────────────────────────────────
-- "I'm shopping for X this week." One row per active watch. When a user
-- finds what they were looking for, they remove the row (or we add a
-- 'completed_at' field later if you want soft-delete + history).
--
-- sub_type / gender / min_price_tier are optional modifiers that narrow
-- the watch beyond just the category (e.g. "Womens Clothes / sub_type:jeans
-- / gender:women / min_price_tier:$$").
CREATE TABLE IF NOT EXISTS subscriber_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL REFERENCES categories(slug) ON DELETE CASCADE,
  sub_type TEXT,
  gender TEXT,
  min_price_tier TEXT,
  last_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subscriber_id, category_slug, sub_type, gender, min_price_tier)
);

CREATE INDEX IF NOT EXISTS subscriber_watches_subscriber_idx
  ON subscriber_watches(subscriber_id);
CREATE INDEX IF NOT EXISTS subscriber_watches_category_idx
  ON subscriber_watches(category_slug);

-- ── Retailer → categories mapping ──────────────────────────────────────
-- Source of truth for "which categories does Madewell typically sell?"
-- Populated lazily by ingest (when a new retailer's first email is
-- processed, LLM tags the retailer with 1-3 likely categories) and
-- supplemented manually via the admin UI / your sheet.
--
-- A retailer can map to multiple categories — e.g. Nordstrom is in
-- fashion, accessories, beauty, shoes.
CREATE TABLE IF NOT EXISTS retailer_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer TEXT NOT NULL,
  category_slug TEXT NOT NULL REFERENCES categories(slug) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(retailer, category_slug)
);

CREATE INDEX IF NOT EXISTS retailer_categories_retailer_idx
  ON retailer_categories(retailer);
CREATE INDEX IF NOT EXISTS retailer_categories_category_idx
  ON retailer_categories(category_slug);

-- ── Retailer rejection log ─────────────────────────────────────────────
-- When a user submits a brand suggestion and you reject it (doesn't ship to
-- US, no promotional emails, etc.), record the reason here. Future
-- duplicate submissions can be auto-replied with the stored reason instead
-- of landing in the admin queue.
CREATE TABLE IF NOT EXISTS retailer_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  rejected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Deal-level additions ───────────────────────────────────────────────
-- deal_subtype: LLM-extracted finer-grained product type per deal
--   ('jeans', 'sneakers', 'lipstick', etc.). Lets watchlists filter
--   beyond category.
-- last_seen_at: bumped every time ingest re-encounters the same deal so
--   we can auto-stale things the retailer stops promoting.
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_subtype TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
UPDATE deals SET last_seen_at = created_at WHERE last_seen_at IS NULL;

CREATE INDEX IF NOT EXISTS deals_last_seen_at_idx ON deals(last_seen_at);
CREATE INDEX IF NOT EXISTS deals_expiration_date_idx ON deals(expiration_date);

-- ── Seed the 61 launch categories ──────────────────────────────────────
-- ON CONFLICT DO NOTHING so re-running the migration is safe and we don't
-- overwrite labels if you've edited them in the admin UI later.
INSERT INTO categories (slug, label, sort_order) VALUES
  ('activewear',              'Activewear',                1),
  ('athleisure',              'Athleisure',                2),
  ('baby-foods',              'Baby Foods',                3),
  ('baby-furniture',          'Baby Furniture',            4),
  ('baby-goods',              'Baby Goods',                5),
  ('bags',                    'Bags',                      6),
  ('bath-and-towels',         'Bath & Towels',             7),
  ('bedding',                 'Bedding',                   8),
  ('books',                   'Books',                     9),
  ('bracelets',               'Bracelets',                10),
  ('cleaning',                'Cleaning',                 11),
  ('coffee-and-tea',          'Coffee & Tea',             12),
  ('eyeglasses',              'Eyeglasses',               13),
  ('fast-food',               'Fast Food',                14),
  ('fitness-equipment',       'Fitness Equipment',        15),
  ('fragrance-and-perfume',   'Fragrance & Perfume',      16),
  ('hair-care',               'Hair Care',                17),
  ('hair-tools',              'Hair Tools',               18),
  ('home-decor',              'Home Decor',               19),
  ('jewelry',                 'Jewelry',                  20),
  ('kids-clothes',            'Kids Clothes',             21),
  ('kids-furniture',          'Kids Furniture',           22),
  ('kitchen-appliances',      'Kitchen Appliances',       23),
  ('lighting',                'Lighting',                 24),
  ('lingerie-and-intimates',  'Lingerie & Intimates',     25),
  ('luggage',                 'Luggage',                  26),
  ('makeup',                  'Makeup',                   27),
  ('mattress',                'Mattress',                 28),
  ('meal-kits',               'Meal Kits',                29),
  ('mens-clothes',            'Mens Clothes',             30),
  ('necklaces',               'Necklaces',                31),
  ('office-and-stationery',   'Office & Stationery',      32),
  ('organization',            'Organization',             33),
  ('outdoor-furniture',       'Outdoor Furniture',        34),
  ('outerwear-and-coats',     'Outerwear & Coats',        35),
  ('pajamas-and-sleepwear',   'Pajamas & Sleepwear',      36),
  ('pet-food',                'Pet Food',                 37),
  ('pet-goods',               'Pet Goods',                38),
  ('plants',                  'Plants',                   39),
  ('plus-sized',              'Plus Sized',               40),
  ('restaurants',             'Restaurants',              41),
  ('rings',                   'Rings',                    42),
  ('rugs',                    'Rugs',                     43),
  ('shoes-and-boots',         'Shoes & Boots',            44),
  ('skincare',                'Skincare',                 45),
  ('skincare-tools',          'Skincare Tools',           46),
  ('sneakers',                'Sneakers',                 47),
  ('socks',                   'Socks',                    48),
  ('subscription-boxes',      'Subscription Boxes',       49),
  ('sunglasses',              'Sunglasses',               50),
  ('swimwear',                'Swimwear',                 51),
  ('tech-and-electronics',    'Tech & Electronics',       52),
  ('tools',                   'Tools',                    53),
  ('toys',                    'Toys',                     54),
  ('travel-gear',             'Travel Gear',              55),
  ('underwear',               'Underwear',                56),
  ('vitamins-and-supplements','Vitamins & Supplements',   57),
  ('wall-art-and-frames',     'Wall Art & Frames',        58),
  ('watches',                 'Watches',                  59),
  ('wine-and-alcohol',        'Wine & Alcohol',           60),
  ('womens-clothes',          'Womens Clothes',           61)
ON CONFLICT (slug) DO NOTHING;
