import OpenAI from 'openai'
import { z } from 'zod'
import type { Category, DealType } from '@/types'
import { overrideCategoriesForRetailer } from '@/lib/deals'

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder' })
}

// Legacy taxonomy — kept so the existing weekly digest send keeps working
// during the rebuild. Will be removed in Phase 6 cleanup.
const LEGACY_CATEGORIES = [
  'accessories', 'beauty', 'baby', 'entertainment', 'fashion',
  'grocery', 'home', 'kids', 'shoes', 'restaurants', 'tools',
  'tech', 'pets',
] as const

const DealSchema = z.object({
  retailer: z.string(),
  description: z.string(),
  percent_off: z.number().nullable().optional(),
  deal_type: z.enum([
    'percent-off', 'bogo-free', 'bogo-half', 'free-item',
    'free-shipping', 'flash-sale', 'stackable', 'loyalty', 'up-to'
  ]).catch('flash-sale'),
  promo_code: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  categories: z.array(z.string()).catch([]),
  deal_subtype: z.string().nullable().optional(),
})

const ExtractionSchema = z.object({
  deals: z.array(DealSchema),
})

type ExtractedDeal = z.infer<typeof DealSchema>

export interface CategoryRow {
  slug: string
  label: string
}

function buildSystemPrompt(newCategories: CategoryRow[]): string {
  const legacyList = LEGACY_CATEGORIES.join(', ')
  const newList = newCategories
    .map((c) => `${c.slug} (${c.label})`)
    .join(', ')

  return `You are a deal extraction specialist for an editorial newsletter called Deal Dossier.

Extract ALL deals and promotions from retail/promotional emails. Be inclusive — if there is any offer, discount, sale, code, or promotion, extract it.

For each deal:
1. RETAILER: The store/brand name (clean, no domain)
2. DESCRIPTION: Clear, factual description of the deal (1–2 sentences, no hype)
3. PERCENT_OFF: The discount percentage as a number (null if not a percentage deal)
4. DEAL_TYPE: One of: percent-off, bogo-free, bogo-half, free-item, free-shipping, flash-sale, stackable, loyalty, up-to
5. PROMO_CODE: The promotional code if present (null if none)
6. EXPIRATION_DATE: The expiration date in YYYY-MM-DD format (null if unknown)
7. LINK: The direct URL to the deal (null if not found)
8. CATEGORIES: Array combining BOTH taxonomies — 1-2 from the legacy list AND 1-3 from the granular list.
   - Legacy (for backwards-compat with current send pipeline): ${legacyList}
   - Granular (for the new watchlist model): ${newList}
   Tag the deal based on what THIS specific email is about, not what the retailer broadly sells. A Walmart grocery email gets ["grocery", "baby-foods"], NOT every category Walmart carries.
9. DEAL_SUBTYPE: A single short fine-grained product type if the email is specifically about it (e.g. "jeans", "sneakers", "lipstick", "coffee maker", "yoga pants"). null for generic / site-wide / multi-product sales.

RULES:
- Extract any sale, discount, promo code, or special offer — even if the percentage is not stated
- "Up to X% off" deals use deal_type "up-to" not "percent-off"
- "Sale" or "event" with no stated percentage: use deal_type "flash-sale" and percent_off null
- For "up-to" and "flash-sale" deals where the email body lists specific brands, products, or categories on sale, include ALL of them in the description as a comma-separated list. Format: "Up to 55% off KitchenAid, Dyson, Instant Pot, Shark, Ninja and more as part of Deals of the Day." Do not truncate with "and more" unless you have genuinely listed every brand mentioned. If no specific items are named, keep the description general.
- For BOGO deals, use bogo-free or bogo-half accordingly
- Free shipping promotions count as deals (deal_type "free-shipping")
- If a retailer has multiple distinct deals, create separate entries for each
- Promo codes should be exact as shown (uppercase)
- Dates should account for the current year if not specified
- If the email is purely transactional (order confirmation, shipping notice) with no promotion, return empty array

DO NOT EXTRACT:
- Welcome offers, new customer offers, or first-order discounts (these are single-use and won't work for most readers)
- Birthday offers or anniversary offers (these are personalized and single-use)
- Return policies, exchange policies, or free returns/exchanges (these are store policies, not deals)
- Loyalty point notices, reward balance updates, or points-earning promotions of any kind — this includes "earn double points," "earn triple points," "bonus points events," or anything where the benefit is rewards points rather than a direct discount on price
- Referral programs or "give $X, get $X" referral offers
- Credit card member exclusives or store card promotions (earn points, special financing, etc.)
- Price listings with no savings — emails that just show what items cost ("Jeans for $39.90", "Tops starting at $12") with no percentage off, no dollar-off amount, and no promo code. A price alone is not a deal.
- "Enjoy $X+ on select styles", "$X+ on select styles", or "Shop styles from $X" messages — these are just price floors, not discounts
- "Starting at $X" promotions where no comparison price, discount amount, or promo code is given
- "Earn $X store cash / store credit with a $Y purchase" — these are deferred-value promotions with redemption windows and spending requirements, not direct discounts (e.g. "Earn $25 LOFT Cash with a $75 purchase")

Return ONLY this exact JSON structure:
{
  "deals": [
    {
      "retailer": "Store Name",
      "description": "Brief description of the deal",
      "percent_off": 40,
      "deal_type": "percent-off",
      "promo_code": "CODE123",
      "expiration_date": "2024-12-31",
      "link": "https://example.com",
      "categories": ["fashion", "womens-clothes"],
      "deal_subtype": "jeans"
    }
  ]
}
Use null for any field that doesn't apply. percent_off must be a number or null.`
}

async function callOpenAIWithRetry(
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  const client = getClient()

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      })
      return response.choices[0]?.message?.content ?? null
    } catch (err) {
      const isRateLimit =
        err instanceof Error &&
        'status' in err &&
        (err as { status?: number }).status === 429
      if (!isRateLimit || attempt === 2) throw err
      const waitMs = 1000 * Math.pow(2, attempt) + Math.random() * 250
      console.warn(`[openai] 429 rate limit, retry ${attempt + 1}/3 in ${Math.round(waitMs)}ms`)
      await new Promise((r) => setTimeout(r, waitMs))
    }
  }
  return null
}

export async function extractDealsFromEmail(
  from: string,
  subject: string,
  body: string,
  newCategories: CategoryRow[] = [],
): Promise<ExtractedDeal[]> {
  // Strip HTML tags and bulk noise for cleaner text
  const cleanBody = body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/https?:\/\/[^\s"'>]{10,}/g, '')   // remove URLs (long, useless for extraction)
    .replace(/base64,[a-zA-Z0-9+/=]+/g, '')      // remove base64 image data
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20000) // Raised from 8k — needed for long weekly-ad emails like H-E-B

  const userPrompt = `FROM: ${from}
SUBJECT: ${subject}
BODY: ${cleanBody}`

  try {
    const content = await callOpenAIWithRetry(buildSystemPrompt(newCategories), userPrompt)
    if (!content) return []

    const parsed = JSON.parse(content)
    console.log('OpenAI raw response:', JSON.stringify(parsed).slice(0, 500))

    const validated = ExtractionSchema.safeParse(parsed)
    if (!validated.success) {
      console.error('Zod validation failed:', JSON.stringify(validated.error.issues))
      return []
    }

    // Apply pattern-based category overrides (e.g. eyewear → accessories,
    // not fashion). Source of truth for category routing lives in lib/deals.
    return validated.data.deals.map((d) => ({
      ...d,
      categories: overrideCategoriesForRetailer(d.retailer, d.categories as Category[]),
    }))
  } catch (err) {
    console.error('OpenAI extraction error:', err)
    return []
  }
}

// ── Retailer category lookup ───────────────────────────────────────────
// Given a retailer name, ask the LLM what categories that brand primarily
// sells (using its training knowledge of the brand, not any specific email).
// Returns slugs from the new taxonomy. Returns empty array if the brand is
// unknown to the model — the caller should fall back to using whatever the
// current deal's tags were.

const RetailerCategoriesSchema = z.object({
  categories: z.array(z.string()),
})

export async function getRetailerCategories(
  retailer: string,
  allCategories: CategoryRow[],
): Promise<string[]> {
  if (!retailer || allCategories.length === 0) return []

  const categoryList = allCategories
    .map((c) => `${c.slug} (${c.label})`)
    .join(', ')

  const systemPrompt = `You are a retail-industry expert. Given a retailer name, list ALL product categories they primarily sell to consumers — based on your general knowledge of the brand, not any specific email.

Use slugs from this list ONLY: ${categoryList}

For mega-retailers (Walmart, Target, Amazon, Costco, Nordstrom, etc.) list every applicable category — there's no cap. For specialty brands (Boll & Branch, Warby Parker, etc.) list 1-3. If the brand is unknown to you, return an empty array.

Return ONLY this exact JSON structure:
{ "categories": ["slug1", "slug2", ...] }`

  try {
    const content = await callOpenAIWithRetry(systemPrompt, `Retailer: ${retailer}`)
    if (!content) return []

    const parsed = JSON.parse(content)
    const validated = RetailerCategoriesSchema.safeParse(parsed)
    if (!validated.success) return []

    // Filter to only valid slugs (defense against LLM hallucination)
    const validSlugs = new Set(allCategories.map((c) => c.slug))
    return validated.data.categories.filter((slug) => validSlugs.has(slug))
  } catch (err) {
    console.error(`[openai] getRetailerCategories error for "${retailer}":`, err)
    return []
  }
}
