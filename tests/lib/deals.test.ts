import { describe, it, expect } from 'vitest'
import {
  rankDeals,
  filterDealsForSubscriber,
  isDealValidForWeek,
  formatSavings,
  getDealLink,
} from '@/lib/deals'
import type { Deal } from '@/types'

const baseWeek = new Date('2026-04-21')

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: '1',
    retailer: 'TestStore',
    description: '40% off everything',
    percent_off: 40,
    deal_type: 'percent-off',
    promo_code: null,
    expiration_date: null,
    original_link: 'https://example.com',
    affiliate_link: null,
    categories: ['fashion'],
    gender: ['men', 'women', 'unisex'],
    week_of: '2026-04-21',
    source_email_id: null,
    source_email_link: null,
    is_manual: false,
    created_at: '2026-04-21T00:00:00Z',
    ...overrides,
  }
}

const defaultFilter = {
  minDiscount: 20,
  enabledCategories: ['fashion'],
  enabledDealTypes: ['percent-off', 'bogo-free', 'free-item', 'free-shipping', 'bogo-half', 'flash-sale', 'stackable', 'loyalty', 'up-to'],
  weekOf: baseWeek,
}

describe('rankDeals', () => {
  it('ranks free-item highest', () => {
    const deals = [
      makeDeal({ deal_type: 'percent-off', percent_off: 50 }),
      makeDeal({ deal_type: 'free-item', percent_off: null }),
    ]
    const ranked = rankDeals(deals)
    expect(ranked[0].deal_type).toBe('free-item')
  })

  it('ranks higher percent-off above lower', () => {
    const deals = [
      makeDeal({ deal_type: 'percent-off', percent_off: 30 }),
      makeDeal({ deal_type: 'percent-off', percent_off: 70 }),
    ]
    const ranked = rankDeals(deals)
    expect(ranked[0].percent_off).toBe(70)
  })

  it('does not mutate original array', () => {
    const deals = [makeDeal({ percent_off: 30 }), makeDeal({ percent_off: 70 })]
    const original = [...deals]
    rankDeals(deals)
    expect(deals[0].percent_off).toBe(original[0].percent_off)
  })
})

describe('isDealValidForWeek', () => {
  it('passes deals with no expiration', () => {
    const deal = makeDeal({ expiration_date: null })
    expect(isDealValidForWeek(deal, baseWeek)).toBe(true)
  })

  it('passes deals that expire after the send day', () => {
    const deal = makeDeal({ expiration_date: '2026-04-25' })
    expect(isDealValidForWeek(deal, baseWeek)).toBe(true)
  })

  it('rejects deals that expire before the send day', () => {
    const deal = makeDeal({ expiration_date: '2026-04-20' })
    expect(isDealValidForWeek(deal, baseWeek)).toBe(false)
  })
})

describe('filterDealsForSubscriber', () => {
  it('returns deals matching enabled categories', () => {
    const deals = [
      makeDeal({ categories: ['fashion'] }),
      makeDeal({ categories: ['tech'] }),
    ]
    const result = filterDealsForSubscriber(deals, 20, ['fashion'], defaultFilter.enabledDealTypes, baseWeek)
    expect(result).toHaveLength(1)
    expect(result[0].categories).toContain('fashion')
  })

  it('filters out deals below min discount', () => {
    const deals = [
      makeDeal({ percent_off: 15 }),
      makeDeal({ percent_off: 25 }),
    ]
    const result = filterDealsForSubscriber(deals, 20, ['fashion'], defaultFilter.enabledDealTypes, baseWeek)
    expect(result).toHaveLength(1)
    expect(result[0].percent_off).toBe(25)
  })

  it('always passes free-item regardless of percent_off', () => {
    const deal = makeDeal({ deal_type: 'free-item', percent_off: null })
    const result = filterDealsForSubscriber([deal], 50, ['fashion'], defaultFilter.enabledDealTypes, baseWeek)
    expect(result).toHaveLength(1)
  })

  it('filters by gender', () => {
    const deals = [
      makeDeal({ gender: ['men'] }),
      makeDeal({ gender: ['women'] }),
    ]
    const result = filterDealsForSubscriber(deals, 20, ['fashion'], defaultFilter.enabledDealTypes, baseWeek, {
      genderFilter: ['women'],
    })
    expect(result).toHaveLength(1)
    expect(result[0].gender).toContain('women')
  })

  it('filters by retailer in retailer mode', () => {
    const deals = [
      makeDeal({ retailer: 'Nike' }),
      makeDeal({ retailer: 'Adidas' }),
    ]
    const result = filterDealsForSubscriber(deals, 20, ['fashion'], defaultFilter.enabledDealTypes, baseWeek, {
      subscriptionMode: 'retailer',
      selectedRetailers: ['Nike'],
    })
    expect(result).toHaveLength(1)
    expect(result[0].retailer).toBe('Nike')
  })

  it('rejects expired deals', () => {
    const deal = makeDeal({ expiration_date: '2026-04-20' })
    const result = filterDealsForSubscriber([deal], 20, ['fashion'], defaultFilter.enabledDealTypes, baseWeek)
    expect(result).toHaveLength(0)
  })
})

describe('formatSavings', () => {
  it('returns BOGO for bogo-free', () => {
    expect(formatSavings(makeDeal({ deal_type: 'bogo-free', percent_off: null }))).toBe('BOGO')
  })

  it('returns percentage for percent-off', () => {
    expect(formatSavings(makeDeal({ deal_type: 'percent-off', percent_off: 40 }))).toBe('40%')
  })

  it('returns Free for free-item', () => {
    expect(formatSavings(makeDeal({ deal_type: 'free-item', percent_off: null }))).toBe('Free')
  })
})

describe('getDealLink', () => {
  it('prefers affiliate_link over original_link', () => {
    const deal = makeDeal({ original_link: 'https://original.com', affiliate_link: 'https://affiliate.com' })
    expect(getDealLink(deal)).toBe('https://affiliate.com')
  })

  it('falls back to original_link when no affiliate', () => {
    const deal = makeDeal({ original_link: 'https://original.com', affiliate_link: null })
    expect(getDealLink(deal)).toBe('https://original.com')
  })
})
