import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { ALL_CATEGORIES, FREE_CATEGORIES } from '@/types'
import type { Category, DealType } from '@/types'

const SubscribeSchema = z.object({
  email: z.string().email(),
  zip_code: z.string().optional(),
})

const DEFAULT_DEAL_TYPES: DealType[] = [
  'percent-off', 'bogo-free', 'bogo-half', 'free-item',
  'free-shipping', 'flash-sale', 'stackable', 'loyalty',
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = SubscribeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const { email, zip_code } = parsed.data
    const supabase = createServiceClient()

    // Upsert subscriber
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .upsert(
        {
          email,
          zip_code: zip_code || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email', ignoreDuplicates: false }
      )
      .select()
      .single()

    if (subError) {
      console.error('Subscribe error:', subError)
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
    }

    const subId = subscriber.id

    // Seed default category preferences (free categories on)
    const categoryRows = ALL_CATEGORIES.map((cat: Category) => ({
      subscriber_id: subId,
      category: cat,
      enabled: FREE_CATEGORIES.includes(cat),
    }))

    await supabase
      .from('subscriber_categories')
      .upsert(categoryRows, { onConflict: 'subscriber_id,category', ignoreDuplicates: true })

    // Seed default deal type preferences
    const dealTypeRows = DEFAULT_DEAL_TYPES.map((dt: DealType) => ({
      subscriber_id: subId,
      deal_type: dt,
      enabled: true,
    }))
    dealTypeRows.push({ subscriber_id: subId, deal_type: 'up-to' as DealType, enabled: false })

    await supabase
      .from('subscriber_deal_types')
      .upsert(dealTypeRows, { onConflict: 'subscriber_id,deal_type', ignoreDuplicates: true })

    return NextResponse.json({ success: true, subscriber_id: subId })
  } catch (err) {
    console.error('Subscribe handler error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
