-- Add a parent group to each category so the watchlist / suggest / login
-- pickers can show "Clothing → Womens Clothes, Mens Clothes, …" instead of
-- a flat alphabetical wall of 61 entries.
--
-- We use a plain text column rather than a separate groups table — the
-- group set is small and stable (8 buckets), and a column lets us hand-
-- edit in the admin UI later. Group ORDER is enforced client-side via
-- lib/categoryGroups.ts so it survives any rename / mass-update in the DB.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS group_name TEXT;

-- Backfill all 61 launch categories. Re-running this migration is safe
-- because each UPDATE matches by slug; new categories added later default
-- to NULL and surface in the "Other" bucket until reassigned.

UPDATE categories SET group_name = 'Clothing' WHERE slug IN (
  'activewear', 'athleisure', 'lingerie-and-intimates', 'mens-clothes',
  'outerwear-and-coats', 'pajamas-and-sleepwear', 'plus-sized', 'socks',
  'swimwear', 'underwear', 'womens-clothes'
);

UPDATE categories SET group_name = 'Shoes & Accessories' WHERE slug IN (
  'bags', 'bracelets', 'eyeglasses', 'jewelry', 'luggage', 'necklaces',
  'rings', 'shoes-and-boots', 'sneakers', 'sunglasses', 'watches'
);

UPDATE categories SET group_name = 'Beauty' WHERE slug IN (
  'fragrance-and-perfume', 'hair-care', 'hair-tools', 'makeup',
  'skincare', 'skincare-tools'
);

UPDATE categories SET group_name = 'Home & Garden' WHERE slug IN (
  'bath-and-towels', 'bedding', 'cleaning', 'home-decor', 'kitchen-appliances',
  'lighting', 'mattress', 'organization', 'outdoor-furniture', 'plants',
  'rugs', 'tools', 'wall-art-and-frames'
);

UPDATE categories SET group_name = 'Baby & Kids' WHERE slug IN (
  'baby-foods', 'baby-furniture', 'baby-goods', 'kids-clothes',
  'kids-furniture', 'toys'
);

UPDATE categories SET group_name = 'Food & Drink' WHERE slug IN (
  'coffee-and-tea', 'fast-food', 'meal-kits', 'restaurants', 'wine-and-alcohol'
);

UPDATE categories SET group_name = 'Pets' WHERE slug IN (
  'pet-food', 'pet-goods'
);

UPDATE categories SET group_name = 'Lifestyle' WHERE slug IN (
  'books', 'fitness-equipment', 'office-and-stationery', 'subscription-boxes',
  'tech-and-electronics', 'travel-gear', 'vitamins-and-supplements'
);

-- Catch-all for anything not in the seed list (or added later without a
-- group assignment) so the UI never drops a category silently.
UPDATE categories SET group_name = 'Other' WHERE group_name IS NULL;
