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
