export type Tier = 'free' | 'paid'

// `Category` is intentionally typed as `string` — categories now live in the
// `categories` DB table (data, not code) and are referenced by slug. Keeping
// a string alias rather than a hardcoded union lets us add categories from
// the DB without a TypeScript redeploy.
export type Category = string

export type DealType =
  | 'percent-off'
  | 'bogo-free'
  | 'bogo-half'
  | 'free-item'
  | 'free-shipping'
  | 'flash-sale'
  | 'stackable'
  | 'loyalty'
  | 'up-to'

export interface Subscriber {
  id: string
  email: string
  zip_code: string | null
  tier: Tier
  is_active: boolean
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  subscription_status: string | null
  created_at: string
  updated_at: string
}

export interface SubscriberWatch {
  id: string
  subscriber_id: string
  category_slug: string
  sub_type: string | null
  gender: string | null
  min_price_tier: string | null
  last_email_sent_at: string | null
  created_at: string
}

export interface Deal {
  id: string
  retailer: string
  description: string
  percent_off: number | null
  deal_type: DealType
  promo_code: string | null
  expiration_date: string | null
  original_link: string
  affiliate_link: string | null
  categories: Category[]
  deal_subtype: string | null
  week_of: string
  source_email_id: string | null
  source_email_link: string | null
  last_seen_at: string | null
  is_manual: boolean
  created_at: string
}


export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  'percent-off': 'Percent Off',
  'bogo-free': 'BOGO Free',
  'bogo-half': 'BOGO Half Off',
  'free-item': 'Free Item',
  'free-shipping': 'Free Shipping',
  'flash-sale': 'Flash Sale',
  'stackable': 'Stackable Codes',
  'loyalty': 'Loyalty Deals',
  'up-to': 'Up To Deals',
}

export const DEAL_RANK: Record<DealType | 'high-discount', number> = {
  'free-item': 1,
  'bogo-free': 5,
  'free-shipping': 8,
  'percent-off': 4,
  'bogo-half': 6,
  'flash-sale': 3,
  'stackable': 7,
  'loyalty': 9,
  'up-to': 10,
  'high-discount': 2,
}
