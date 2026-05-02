// Shared store-data helpers used by both the send cron and the preview route.
// Stores live in a Google Sheet (via /api/stores) — not in the DB — so we
// fetch through the API route which handles CSV parsing and caching.

const TIER_BOOST: Record<string, number> = { '$': 0, '$$': 3, '$$$': 10, '$$$$': 25 }

/** Normalise a store name for fuzzy key matching (strips accents, punctuation, spaces). */
export function normalizeStoreName(name: string): string {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Title-case a string by capitalizing the first letter of each space-delimited
 *  word, preserving the rest as-is so existing all-caps acronyms (H-E-B, COS,
 *  CB2) survive untouched. Used as a fallback when a retailer isn't in the
 *  Google Sheet — the LLM extractor sometimes returns lower-cased names. */
export function titleCaseRetailer(name: string): string {
  return name
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

/** Map a raw retailer name (as extracted by the LLM) to its canonical display
 *  name. Lookup order:
 *    1. Exact lowercase match against storeNames
 *    2. Normalised match (strips accents/punctuation)
 *    3. Title-cased version of the raw name (handles "carter's" → "Carter's")
 *  Returns the original string only if every fallback fails. */
export function canonicalRetailerName(
  raw: string,
  storeNames: Record<string, string>
): string {
  if (!raw) return raw
  const lc = raw.toLowerCase()
  if (storeNames[lc]) return storeNames[lc]
  const norm = normalizeStoreName(raw)
  if (storeNames[norm]) return storeNames[norm]
  // Last resort — fix obvious lowercase-first-letter issues
  return titleCaseRetailer(raw)
}

export async function fetchStoreData(appUrl: string): Promise<{
  storeUrls: Record<string, string>
  storeTiers: Record<string, number>
  storeNames: Record<string, string>
}> {
  try {
    const res = await fetch(`${appUrl}/api/stores`, { next: { revalidate: 3600 } })
    if (!res.ok) return { storeUrls: {}, storeTiers: {}, storeNames: {} }
    const { stores } = await res.json()
    const storeUrls: Record<string, string> = {}
    const storeTiers: Record<string, number> = {}
    const storeNames: Record<string, string> = {}
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
      // Canonical display name from the sheet — preserves user's intended casing
      storeNames[lcKey] = store.name
      storeNames[normKey] = store.name
    }
    return { storeUrls, storeTiers, storeNames }
  } catch {
    return { storeUrls: {}, storeTiers: {}, storeNames: {} }
  }
}
