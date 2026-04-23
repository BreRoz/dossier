export type Tier = 'free' | 'paid'
export type SubscriptionMode = 'category' | 'retailer'
export type GenderOption = 'men' | 'women' | 'unisex'
export type SpendTier = '$' | '$$' | '$$$' | '$$$$'

export type SendDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export type Category =
  | 'accessories'
  | 'beauty'
  | 'baby'
  | 'entertainment'
  | 'fashion'
  | 'grocery'
  | 'home'
  | 'kids'
  | 'shoes'
  | 'restaurants'
  | 'tools'
  | 'tech'
  | 'travel'

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
  send_day: SendDay
  min_discount: 20 | 30 | 40 | 50
  subscription_mode: SubscriptionMode
  gender_filter: GenderOption[]
  spend_tier_filter: SpendTier[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SubscriberRetailer {
  id: string
  subscriber_id: string
  retailer: string
  enabled: boolean
}

export interface SubscriberCategory {
  id: string
  subscriber_id: string
  category: Category
  enabled: boolean
}

export interface SubscriberDealType {
  id: string
  subscriber_id: string
  deal_type: DealType
  enabled: boolean
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
  gender: GenderOption[]
  week_of: string
  source_email_id: string | null
  is_manual: boolean
  created_at: string
}

export interface Edition {
  id: string
  week_of: string
  issue_number: number | null
  emails_scanned: number
  deals_found: number
  retailers_count: number
  created_at: string
}

export interface UserPreferences {
  zip_code: string | null
  send_day: SendDay
  min_discount: 20 | 30 | 40 | 50
  categories: Record<Category, boolean>
  deal_types: Record<DealType, boolean>
  subscription_mode: SubscriptionMode
  gender_filter: GenderOption[]
  spend_tier_filter: SpendTier[]
  selected_retailers: string[]
}

export const FREE_CATEGORIES: Category[] = ['fashion', 'restaurants', 'grocery']

export const ALL_CATEGORIES: Category[] = [
  'accessories',
  'beauty',
  'baby',
  'entertainment',
  'fashion',
  'grocery',
  'home',
  'kids',
  'shoes',
  'restaurants',
  'tools',
  'tech',
  'travel',
]

export const CATEGORY_LABELS: Record<Category, string> = {
  'accessories':   'Accessories',
  'beauty':        'Beauty',
  'baby':          'Baby',
  'entertainment': 'Entertainment',
  'fashion':       'Fashion',
  'grocery':       'Grocery',
  'home':          'Home',
  'kids':          'Kids',
  'shoes':         'Shoes',
  'restaurants':   'Restaurants',
  'tools':         'Tools',
  'tech':          'Tech',
  'travel':        'Travel',
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
