import { addDays, startOfDay, getDay, format, parseISO, isAfter, isBefore } from 'date-fns'
import type { Deal, DealType, SendDay } from '@/types'

const SEND_DAY_TO_DOW: Record<SendDay, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
}

export function getCurrentWeekOf(sendDay: SendDay = 'thursday'): Date {
  const today = startOfDay(new Date())
  const targetDow = SEND_DAY_TO_DOW[sendDay]
  const currentDow = getDay(today)

  let daysBack = currentDow - targetDow
  if (daysBack < 0) daysBack += 7
  return addDays(today, -daysBack)
}

function getValidWindowForWeek(weekOf: Date): { from: Date; through: Date } {
  return {
    from: weekOf,
    through: addDays(weekOf, 6), // through following Wednesday (6 days later)
  }
}

function isDealValidForWeek(deal: Deal, weekOf: Date): boolean {
  if (!deal.expiration_date) return true

  const window = getValidWindowForWeek(weekOf)
  const expiry = parseISO(deal.expiration_date)

  // Deal expires before the send day — skip
  if (isBefore(expiry, window.from)) return false

  return true
}

const DEAL_RANK_SCORE = (deal: Deal): number => {
  const type = deal.deal_type
  const pct = deal.percent_off || 0

  if (type === 'free-item') return 100
  if (pct >= 70) return 95
  if (pct >= 60) return 90
  if (pct >= 50) return 85
  if (type === 'bogo-free') return 80
  if (pct >= 40) return 75
  if (pct >= 30) return 70
  if (type === 'bogo-half') return 65
  if (type === 'free-shipping') return 40
  return 30
}

// Boost score based on store price tier — pricier stores rank higher
// at the same discount level (a sale at Saks > a sale at Old Navy)
const TIER_BOOST: Record<string, number> = {
  '$':    0,
  '$$':   3,
  '$$$':  10,
  '$$$$': 25,
}

// Build a dedup key for a deal.
// When a deal has no percent_off AND no promo_code, it's product-specific
// (e.g. H-E-B "Buy X get Y free" items). Use a description snippet so each
// product stays distinct. Otherwise deduplicate by retailer + type + discount.
export function makeDealKey(deal: { retailer: string; deal_type: string; percent_off?: number | null; promo_code?: string | null; description?: string | null }): string {
  if (deal.percent_off == null && !deal.promo_code) {
    // Product-specific deal — use normalized description snippet as tiebreaker
    const snippet = (deal.description ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 50)
    return `${deal.retailer}||${deal.deal_type}||desc:${snippet}`
  }
  return `${deal.retailer}||${deal.deal_type}||${deal.percent_off ?? 'null'}`
}

// Remove duplicate sales: if the same retailer has the same deal_type + percent_off,
// keep only the highest-ranked one (best description, promo code, etc.)
function dedupeDeals(deals: Deal[]): Deal[] {
  const seen = new Map<string, Deal>()
  for (const deal of deals) {
    const key = makeDealKey(deal)
    const existing = seen.get(key)
    if (!existing || DEAL_RANK_SCORE(deal) > DEAL_RANK_SCORE(existing)) {
      seen.set(key, deal)
    }
  }
  return Array.from(seen.values())
}

// storeTiers: retailer name (lowercase, normalized) → spendTier string ('$'..'$$$$')
export function rankDeals(deals: Deal[], storeTiers?: Record<string, number>): Deal[] {
  const totalScore = (deal: Deal): number => {
    const base = DEAL_RANK_SCORE(deal)
    if (!storeTiers) return base
    const key = deal.retailer.toLowerCase().replace(/[^a-z0-9]/g, '')
    const tierBoost = storeTiers[key] ?? storeTiers[deal.retailer.toLowerCase()] ?? 0
    return base + tierBoost
  }

  return dedupeDeals([...deals]).sort((a, b) => {
    // Primary: rank score + tier boost
    const scoreDiff = totalScore(b) - totalScore(a)
    if (scoreDiff !== 0) return scoreDiff

    // Secondary: higher percent_off wins within the same score tier
    const pctDiff = (b.percent_off ?? 0) - (a.percent_off ?? 0)
    if (pctDiff !== 0) return pctDiff

    // Tertiary: alphabetical by retailer
    return a.retailer.localeCompare(b.retailer)
  })
}

export function filterDealsForSubscriber(
  deals: Deal[],
  minDiscount: number,
  enabledCategories: string[],
  enabledDealTypes: string[],
  weekOf: Date,
  options?: {
    genderFilter?: string[]         // e.g. ['men','women','unisex']
    subscriptionMode?: 'category' | 'retailer'
    selectedRetailers?: string[]    // only used when subscriptionMode === 'retailer'
    excludeFreeShipping?: boolean   // paid tier: strip free-shipping deals entirely
  }
): Deal[] {
  const {
    genderFilter = ['men', 'women', 'unisex'],
    subscriptionMode = 'category',
    selectedRetailers = [],
    excludeFreeShipping = false,
  } = options || {}

  return deals.filter((deal) => {
    if (!isDealValidForWeek(deal, weekOf)) return false

    // Paid tier: strip free-shipping deals entirely
    if (excludeFreeShipping && deal.deal_type === 'free-shipping') return false

    // — Gender filter —
    // A deal passes if it shares at least one gender tag with the subscriber's filter.
    // Deals without a gender field (legacy) are treated as all-gender.
    const dealGenders: string[] = (deal as Deal & { gender?: string[] }).gender ?? ['men', 'women', 'unisex']
    const genderMatch = dealGenders.some((g) => genderFilter.includes(g))
    if (!genderMatch) return false

    // — Category / retailer scope —
    if (subscriptionMode === 'retailer') {
      // In retailer mode, subscriber selected specific retailers
      if (selectedRetailers.length > 0 && !selectedRetailers.includes(deal.retailer)) {
        return false
      }
    } else {
      // Default category mode
      const inCategory = deal.categories.some((c) => enabledCategories.includes(c))
      if (!inCategory) return false
    }

    if (!enabledDealTypes.includes(deal.deal_type)) return false

    if (deal.percent_off !== null && deal.percent_off < minDiscount) {
      if (!['free-item', 'bogo-free', 'bogo-half', 'free-shipping'].includes(deal.deal_type)) {
        return false
      }
    }

    return true
  })
}

export function getDealLink(deal: Deal): string {
  return deal.affiliate_link || deal.original_link
}

export function formatExpiryDate(dateStr: string | null): string | null {
  if (!dateStr) return null
  try {
    return format(parseISO(dateStr), 'MMM d')
  } catch {
    return null
  }
}

const JUNK_DEAL_TYPES = new Set(['free-shipping', 'bogo-free', 'bogo-half', 'free-item'])

// Retailers we never want to publish under any circumstance. The LLM
// occasionally extracts these as the retailer when promotional content is
// embedded inside another brand's email (e.g. an FTD bouquet promotion in
// a third-party newsletter). Blocked at ingest (so nothing new lands in the
// DB) and at render (so legacy rows are filtered out of email + archive).
const BLOCKED_RETAILER_PATTERNS: RegExp[] = [
  /\bftd\b/i,
]

function isBlockedRetailer(retailer: string | null | undefined): boolean {
  if (!retailer) return false
  return BLOCKED_RETAILER_PATTERNS.some((p) => p.test(retailer))
}

/**
 * Returns true for deals that should never appear in emails regardless of
 * subscriber preferences: welcome offers, loyalty/points promos, store cash,
 * price listings, and vague flash sales with no concrete savings.
 *
 * Used as a backstop in both the ingest route (to avoid DB pollution) and
 * the send routes (to catch anything that slipped through ingest).
 */
export function isJunkDeal(deal: Pick<Deal, 'deal_type' | 'description'> & { retailer?: string | null; percent_off?: number | null; promo_code?: string | null }): boolean {
  const desc = deal.description ?? ''

  // Blocked retailers (e.g. FTD) — never publish regardless of content
  if (isBlockedRetailer(deal.retailer)) return true

  // Welcome / first-order / new-customer offers — single-use, won't work for most readers
  if (/\b(welcome\s+(code|offer|discount|deal)|code\s+welcome\b|first[\s-]?(order|purchase|time)\s+(discount|offer|code|deal|off)|new\s+customer\s+(offer|discount|code|deal)|first\s+\d+%\s*off|valid\s+(only\s+)?once\s+per\s+(person|customer|user|account|household))\b/i.test(desc))
    return true

  // Personalized / one-time-use coupons — issued to a specific recipient with
  // a per-account validity window or a unique code. Show up most often as
  // birthday/anniversary/loyalty rewards or post-purchase thank-yous.
  // Examples we want to catch:
  //   "$10 off valid for 30 days from issuance"
  //   "Single-use code expires 7 days after delivery"
  //   "Your personal coupon — non-transferable"
  if (/\b(valid\s+for\s+\d+\s+days?\s+from\s+(issuance|enrollment|delivery|receipt|sign[\s-]?up|registration|when\s+issued)|expires\s+\d+\s+days?\s+(after|from)\s+(issuance|enrollment|delivery|receipt|sign[\s-]?up|registration)|one[\s-]?time[\s-]?use\s+(code|coupon|promo|offer|discount)?|single[\s-]?use\s+(code|coupon|promo|offer|discount)|personal(?:ized)?\s+(coupon|code|promo|discount)|non[\s-]?transferable|unique\s+(promo\s+)?code\s+(just\s+)?for\s+you|good\s+for\s+one\s+use\s+only)\b/i.test(desc))
    return true

  // Free returns / exchanges — a return policy, not a price discount
  if (/\bfree\s+(returns?|exchanges?)\b/i.test(desc) &&
    !/\d+%\s*off|\$\d+\s*(off|savings?)|save\s+\$\d+/i.test(desc))
    return true

  // Loyalty / points promotions — earning points is not a price discount
  if (deal.deal_type === 'loyalty' || /earn\s+(double|triple|\d+x|bonus)\s+points|bonus\s+points\s+event|rewards?\s+(credit\s+card|members?\s+earn)/i.test(desc))
    return true

  // Store cash / deferred credit (e.g. LOFT Cash, Kohl's Cash)
  if (/earn\s+\$\d+\s+\w*\s*(cash|credit|reward)|get\s+\$\d+\s+\w*\s*(cash|credit)\s+when\s+you\s+spend/i.test(desc) &&
    !/\d+%\s*off|\$\d+\s*off/i.test(desc))
    return true

  // Price listings with no actual discount
  if (!deal.percent_off &&
    !deal.promo_code &&
    !JUNK_DEAL_TYPES.has(deal.deal_type) &&
    /(?:starting at|from|for|at)\s+\$\d+|enjoy\s+\$\d+\+?\s+on|\$\d+\+?\s+on\s+select|^[\w\s]+for\s+\$\d+\.\d{2}/i.test(desc) &&
    !/\d+%\s*off|\$\d+\s*(off|savings?)|save\s+\$\d+/i.test(desc))
    return true

  // Vague flash sales with no concrete savings info
  if (deal.deal_type === 'flash-sale' &&
    !deal.percent_off &&
    !deal.promo_code &&
    !/\d+%|\$\d+\s*(off|savings?)|buy\s+\d+|bogo/i.test(desc))
    return true

  return false
}

export function formatSavings(deal: Deal): string {
  if (deal.deal_type === 'bogo-free') return 'BOGO'
  if (deal.deal_type === 'bogo-half') return 'BOGO 50%'
  if (deal.deal_type === 'free-item') return 'Free'
  if (deal.deal_type === 'free-shipping') return 'Free Shipping'
  if (deal.percent_off) return `${deal.percent_off}%`
  return deal.deal_type.replace('-', ' ')
}
