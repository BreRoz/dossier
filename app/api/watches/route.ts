// GET  /api/watches  — list the signed-in subscriber's active watches.
// POST /api/watches  — create a new watch. Body: { category_slug, sub_type? }

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function loadSubscriberId(email: string): Promise<string | null> {
  const service = createServiceClient()
  const { data } = await service
    .from('subscribers')
    .select('id')
    .eq('email', email)
    .single()
  return data?.id ?? null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subscriberId = await loadSubscriberId(user.email)
  if (!subscriberId) {
    return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('subscriber_watches')
    .select(`
      id,
      category_slug,
      sub_type,
      gender,
      min_price_tier,
      last_email_sent_at,
      created_at,
      categories!inner(label, sort_order)
    `)
    .eq('subscriber_id', subscriberId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[watches GET] error:', JSON.stringify(error))
    return NextResponse.json({ error: 'Failed to load watches' }, { status: 500 })
  }

  const watches = (data ?? []).map((w) => {
    const cat = Array.isArray(w.categories) ? w.categories[0] : w.categories
    return {
      id: w.id,
      category_slug: w.category_slug,
      category_label: cat?.label ?? w.category_slug,
      sub_type: w.sub_type,
      gender: w.gender,
      min_price_tier: w.min_price_tier,
      last_email_sent_at: w.last_email_sent_at,
      created_at: w.created_at,
    }
  })

  return NextResponse.json({ watches })
}

const Body = z.object({
  category_slug: z.string().min(1).max(80),
  sub_type: z.string().max(80).nullable().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const subscriberId = await loadSubscriberId(user.email)
  if (!subscriberId) {
    return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
  }

  const service = createServiceClient()

  // Verify the category slug exists + is active
  const { data: category } = await service
    .from('categories')
    .select('slug')
    .eq('slug', parsed.data.category_slug)
    .eq('is_active', true)
    .single()
  if (!category) {
    return NextResponse.json({ error: 'Unknown category' }, { status: 400 })
  }

  const { data: inserted, error } = await service
    .from('subscriber_watches')
    .insert({
      subscriber_id: subscriberId,
      category_slug: parsed.data.category_slug,
      sub_type: parsed.data.sub_type ?? null,
    })
    .select('id, category_slug, sub_type, created_at')
    .single()

  if (error) {
    // Duplicate watch — friendly response, not a hard failure
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'You already have this on your watchlist.' },
        { status: 409 }
      )
    }
    console.error('[watches POST] error:', JSON.stringify(error))
    return NextResponse.json({ error: 'Failed to add watch' }, { status: 500 })
  }

  return NextResponse.json({ watch: inserted })
}
