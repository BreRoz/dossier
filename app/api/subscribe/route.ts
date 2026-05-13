import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'

const SubscribeSchema = z.object({
  email: z.string().email(),
  zip_code: z.string().optional(),
  // Optional list of category slugs to pre-populate the subscriber's
  // watchlist with. Sent from the signup form when the user picks
  // categories during "what are you shopping for?". Existing
  // subscribers can resubmit with new picks; duplicates are ignored.
  watches: z.array(z.string().min(1)).max(20).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = SubscribeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const { email, zip_code, watches } = parsed.data
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

    // Seed watchlist from the signup picker. Filter against the
    // categories table so an attacker can't inject arbitrary slugs.
    if (watches && watches.length > 0) {
      const { data: validCats } = await supabase
        .from('categories')
        .select('slug')
        .in('slug', watches)
        .eq('is_active', true)
      const validSlugs = new Set((validCats ?? []).map((c) => c.slug))
      const watchRows = watches
        .filter((slug) => validSlugs.has(slug))
        .map((slug) => ({ subscriber_id: subId, category_slug: slug }))
      if (watchRows.length > 0) {
        await supabase
          .from('subscriber_watches')
          .upsert(watchRows, {
            onConflict: 'subscriber_id,category_slug,sub_type,gender,min_price_tier',
            ignoreDuplicates: true,
          })
      }
    }

    return NextResponse.json({ success: true, subscriber_id: subId })
  } catch (err) {
    console.error('Subscribe handler error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
