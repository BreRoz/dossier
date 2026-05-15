// Canonical display order for the category groups + a hardcoded fallback
// map from slug → group. The categories table also has a `group_name`
// column (migration 015) which wins if set — this map keeps the UI
// working even before the migration runs and serves as the single source
// of truth for the launch taxonomy.

export const CATEGORY_GROUP_ORDER = [
  'Clothing',
  'Shoes & Accessories',
  'Beauty',
  'Home & Garden',
  'Baby & Kids',
  'Food & Drink',
  'Pets',
  'Lifestyle',
  'Other',
] as const

export const CATEGORY_GROUP_FALLBACK = 'Other'

// Slug → group lookup for the 61 launch categories. Anything not in this
// map AND not tagged in the DB falls into 'Other'.
export const SLUG_TO_GROUP: Record<string, string> = {
  // Clothing
  'activewear': 'Clothing',
  'athleisure': 'Clothing',
  'lingerie-and-intimates': 'Clothing',
  'mens-clothes': 'Clothing',
  'outerwear-and-coats': 'Clothing',
  'pajamas-and-sleepwear': 'Clothing',
  'plus-sized': 'Clothing',
  'socks': 'Clothing',
  'swimwear': 'Clothing',
  'underwear': 'Clothing',
  'womens-clothes': 'Clothing',

  // Shoes & Accessories
  'bags': 'Shoes & Accessories',
  'bracelets': 'Shoes & Accessories',
  'eyeglasses': 'Shoes & Accessories',
  'jewelry': 'Shoes & Accessories',
  'luggage': 'Shoes & Accessories',
  'necklaces': 'Shoes & Accessories',
  'rings': 'Shoes & Accessories',
  'shoes-and-boots': 'Shoes & Accessories',
  'sneakers': 'Shoes & Accessories',
  'sunglasses': 'Shoes & Accessories',
  'watches': 'Shoes & Accessories',

  // Beauty
  'fragrance-and-perfume': 'Beauty',
  'hair-care': 'Beauty',
  'hair-tools': 'Beauty',
  'makeup': 'Beauty',
  'skincare': 'Beauty',
  'skincare-tools': 'Beauty',

  // Home & Garden
  'bath-and-towels': 'Home & Garden',
  'bedding': 'Home & Garden',
  'cleaning': 'Home & Garden',
  'home-decor': 'Home & Garden',
  'kitchen-appliances': 'Home & Garden',
  'lighting': 'Home & Garden',
  'mattress': 'Home & Garden',
  'organization': 'Home & Garden',
  'outdoor-furniture': 'Home & Garden',
  'plants': 'Home & Garden',
  'rugs': 'Home & Garden',
  'tools': 'Home & Garden',
  'wall-art-and-frames': 'Home & Garden',

  // Baby & Kids
  'baby-foods': 'Baby & Kids',
  'baby-furniture': 'Baby & Kids',
  'baby-goods': 'Baby & Kids',
  'kids-clothes': 'Baby & Kids',
  'kids-furniture': 'Baby & Kids',
  'toys': 'Baby & Kids',

  // Food & Drink
  'coffee-and-tea': 'Food & Drink',
  'fast-food': 'Food & Drink',
  'meal-kits': 'Food & Drink',
  'restaurants': 'Food & Drink',
  'wine-and-alcohol': 'Food & Drink',

  // Pets
  'pet-food': 'Pets',
  'pet-goods': 'Pets',

  // Lifestyle
  'books': 'Lifestyle',
  'fitness-equipment': 'Lifestyle',
  'office-and-stationery': 'Lifestyle',
  'subscription-boxes': 'Lifestyle',
  'tech-and-electronics': 'Lifestyle',
  'travel-gear': 'Lifestyle',
  'vitamins-and-supplements': 'Lifestyle',
}

export interface CategoryWithGroup {
  slug: string
  label: string
  group_name?: string | null
}

/**
 * Group a flat list of categories into ordered sections.
 *
 * Resolution order for each category's group:
 *   1. DB `group_name` if present (admin override)
 *   2. Hardcoded SLUG_TO_GROUP lookup
 *   3. CATEGORY_GROUP_FALLBACK ('Other')
 *
 * Output preserves CATEGORY_GROUP_ORDER for the sections. Within each
 * section the input order is preserved (typically DB sort_order, which
 * is alphabetical by label). Empty groups are omitted.
 */
export function groupCategories<T extends CategoryWithGroup>(
  categories: T[]
): Array<{ name: string; items: T[] }> {
  const byGroup = new Map<string, T[]>()
  for (const c of categories) {
    const name = c.group_name || SLUG_TO_GROUP[c.slug] || CATEGORY_GROUP_FALLBACK
    const bucket = byGroup.get(name) ?? []
    bucket.push(c)
    byGroup.set(name, bucket)
  }

  const ordered: Array<{ name: string; items: T[] }> = []
  for (const name of CATEGORY_GROUP_ORDER) {
    const items = byGroup.get(name)
    if (items && items.length > 0) {
      ordered.push({ name, items })
      byGroup.delete(name)
    }
  }
  // Any unexpected group names (e.g. admin added a new group without
  // updating CATEGORY_GROUP_ORDER) — append at the end alphabetically
  // so they're visible rather than silently dropped.
  for (const name of Array.from(byGroup.keys()).sort()) {
    ordered.push({ name, items: byGroup.get(name)! })
  }
  return ordered
}
