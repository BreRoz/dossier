import OpenAI from 'openai'
import { z } from 'zod'
import type { Category, DealType } from '@/types'

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder' })
}

const DealSchema = z.object({
  retailer: z.string(),
  description: z.string(),
  percent_off: z.number().nullable(),
  deal_type: z.enum([
    'percent-off', 'bogo-free', 'bogo-half', 'free-item',
    'free-shipping', 'flash-sale', 'stackable', 'loyalty', 'up-to'
  ]),
  promo_code: z.string().nullable(),
  expiration_date: z.string().nullable(), // ISO date string YYYY-MM-DD
  link: z.string().url().nullable(),
  categories: z.array(z.enum([
    'premium-fashion', 'everyday-fashion', 'athletic', 'beauty',
    'baby', 'kids', 'home', 'tools-yard', 'fast-food',
    'restaurants', 'grocery', 'tech', 'travel'
  ])),
})

const ExtractionSchema = z.object({
  deals: z.array(DealSchema),
})

export type ExtractedDeal = z.infer<typeof DealSchema>

const SYSTEM_PROMPT = `You are a deal extraction specialist for an editorial newsletter called DOSSIER.

Extract all distinct deals from promotional emails. For each deal:

1. RETAILER: The store/brand name (clean, no domain)
2. DESCRIPTION: Clear, factual description of the deal (1–2 sentences, no hype)
3. PERCENT_OFF: The discount percentage as a number (null if not a percentage deal)
4. DEAL_TYPE: One of: percent-off, bogo-free, bogo-half, free-item, free-shipping, flash-sale, stackable, loyalty, up-to
5. PROMO_CODE: The promotional code if present (null if none)
6. EXPIRATION_DATE: The expiration date in YYYY-MM-DD format (null if unknown)
7. LINK: The direct URL to the deal (null if not found)
8. CATEGORIES: Array of relevant categories from: premium-fashion, everyday-fashion, athletic, beauty, baby, kids, home, tools-yard, fast-food, restaurants, grocery, tech, travel

RULES:
- If a retailer has multiple distinct deals, create separate entries for each
- If a retailer spans multiple categories (e.g., Target has fashion AND grocery), assign ALL relevant categories
- "Up to X% off" deals use deal_type "up-to" not "percent-off"
- For BOGO deals, use bogo-free or bogo-half accordingly
- Extract only genuine deals, not generic marketing copy
- Be conservative: only extract deals with clear discount value
- Promo codes should be exact as shown (uppercase)
- Dates should account for the current year if not specified`

export async function extractDealsFromEmail(
  from: string,
  subject: string,
  body: string
): Promise<ExtractedDeal[]> {
  // Strip HTML tags for cleaner text
  const cleanBody = body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000) // Limit to avoid token overflow

  const userPrompt = `FROM: ${from}
SUBJECT: ${subject}
BODY: ${cleanBody}`

  try {
    const client = getClient()
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    })

    const content = response.choices[0]?.message?.content
    if (!content) return []

    const parsed = JSON.parse(content)
    const validated = ExtractionSchema.safeParse(parsed)
    if (!validated.success) return []

    return validated.data.deals
  } catch {
    return []
  }
}
