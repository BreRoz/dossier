// Shared store-data helpers used by both the send cron and the preview route.
// Stores live in a Google Sheet (via /api/stores) — not in the DB — so we
// fetch through the API route which handles CSV parsing and caching.

const TIER_BOOST: Record<string, number> = { '$': 0, '$$': 3, '$$$': 10, '$$$$': 25 }

/** Normalise a store name for fuzzy key matching (strips accents, punctuation, spaces). */
function normalizeStoreName(name: string): string {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Title-case a string by capitalizing the first letter of each space-delimited
 *  word, preserving the rest as-is. Existing acronyms / mixed-case names
 *  (H-E-B, COS, CB2) survive untouched. */
function titleCaseRetailer(name: string): string {
  return name
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

/** Fix retailer name casing without overriding the LLM's extraction.
 *  - If the name already contains any uppercase letter, trust it as-is
 *    (so "H-E-B", "Apple Store", "Carter's Childrenswear" all pass through)
 *  - If the name is entirely lowercase ("carter's"), title-case it so the
 *    first letter of each word becomes uppercase ("Carter's")
 *  Source emails / their LLM output remain authoritative for what the
 *  retailer is actually called — this is purely a cosmetic correction
 *  for the all-lowercase failure mode. */
export function fixRetailerCase(name: string): string {
  if (!name) return name
  if (/[A-Z]/.test(name)) return name
  return titleCaseRetailer(name)
}

export async function fetchStoreData(appUrl: string): Promise<{
  storeUrls: Record<string, string>
  storeTiers: Record<string, number>
}> {
  try {
    const res = await fetch(`${appUrl}/api/stores`, { next: { revalidate: 3600 } })
    if (!res.ok) return { storeUrls: {}, storeTiers: {} }
    const { stores } = await res.json()
    const storeUrls: Record<string, string> = {}
    const storeTiers: Record<string, number> = {}
    for (const store of stores ?? []) {
      if (!store.name) continue
      const normKey = normalizeStoreName(store.name)
      const lcKey = store.name.toLowerCase()
      if (store.website) {
        const url = store.website.startsWith('http') ? store.website : `https://${store.website}`
        storeUrls[lcKey] = url
        storeUrls[normKey] = url
      }
      const boost = TIER_BOOST[store.spendTier?.trim()] ?? 0
      storeTiers[normKey] = boost
      storeTiers[lcKey] = boost
    }
    return { storeUrls, storeTiers }
  } catch {
    return { storeUrls: {}, storeTiers: {} }
  }
}
