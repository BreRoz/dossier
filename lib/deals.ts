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

export function getValidWindowForWeek(weekOf: Date): { from: Date; through: Date } {
  return {
    from: weekOf,
    through: addDays(weekOf, 6), // through following Wednesday (6 days later)
  }
}

export function isDealValidForWeek(deal: Deal, weekOf: Date): boolean {
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

export function rankDeals(deals: Deal[]): Deal[] {
  return [...deals].sort((a, b) => DEAL_RANK_SCORE(b) - DEAL_RANK_SCORE(a))
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
  }
): Deal[] {
  const {
    genderFilter = ['men', 'women', 'unisex'],
    subscriptionMode = 'category',
    selectedRetailers = [],
  } = options || {}

  return deals.filter((deal) => {
    if (!isDealValidForWeek(deal, weekOf)) return false

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

    if (deal.deal_type === 'up-to') {
      return enabledDealTypes.includes('up-to')
    }

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

export function formatSavings(deal: Deal): string {
  if (deal.deal_type === 'bogo-free') return 'BOGO'
  if (deal.deal_type === 'bogo-half') return 'BOGO 50%'
  if (deal.deal_type === 'free-item') return 'Free'
  if (deal.deal_type === 'free-shipping') return 'Free Ship'
  if (deal.percent_off) return `${deal.percent_off}%`
  return deal.deal_type.replace('-', ' ')
}
