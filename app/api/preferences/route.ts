import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Category, DealType, SendDay } from '@/types'
import { ALL_CATEGORIES } from '@/types'

const GENDER_OPTIONS = ['men', 'women', 'unisex'] as const
const SPEND_TIERS = ['$', '$$', '$$$', '$$$$'] as const

const PreferencesSchema = z.object({
  preferences: z.object({
    zip_code: z.string().nullable().optional(),
    send_day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
    min_discount: z.union([z.literal(20), z.literal(30), z.literal(40), z.literal(50)]).optional(),
    categories: z.record(z.boolean()).optional(),
    deal_types: z.record(z.boolean()).optional(),
    subscription_mode: z.enum(['category', 'retailer']).optional(),
    gender_filter: z.array(z.enum(GENDER_OPTIONS)).optional(),
    spend_tier_filter: z.array(z.enum(SPEND_TIERS)).optional(),
    selected_retailers: z.array(z.string()).optional(),
  }),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  const { data: subscriber } = await service
    .from('subscribers')
    .select('*')
    .eq('email', user.email)
    .single()

  if (!subscriber) {
    return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
  }

  const [{ data: cats }, { data: dts }, { data: retailers }] = await Promise.all([
    service.from('subscriber_categories').select('*').eq('subscriber_id', subscriber.id),
    service.from('subscriber_deal_types').select('*').eq('subscriber_id', subscriber.id),
    service.from('subscriber_retailers').select('retailer').eq('subscriber_id', subscriber.id).eq('enabled', true),
  ])

  const categories: Record<string, boolean> = {}
  for (const c of cats || []) categories[c.category] = c.enabled

  const deal_types: Record<string, boolean> = {}
  for (const d of dts || []) deal_types[d.deal_type] = d.enabled

  const selected_retailers = (retailers || []).map((r: { retailer: string }) => r.retailer)

  return NextResponse.json({
    tier: subscriber.tier,
    preferences: {
      zip_code: subscriber.zip_code,
      send_day: subscriber.send_day,
      min_discount: subscriber.min_discount,
      subscription_mode: subscriber.subscription_mode ?? 'category',
      gender_filter: subscriber.gender_filter ?? ['men', 'women', 'unisex'],
      spend_tier_filter: subscriber.spend_tier_filter ?? ['$', '$$', '$$$', '$$$$'],
      categories,
      deal_types,
      selected_retailers,
    },
  })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = PreferencesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid preferences' }, { status: 400 })
  }

  const { preferences } = parsed.data
  const service = createServiceClient()

  const { data: subscriber } = await service
    .from('subscribers')
    .select('*')
    .eq('email', user.email)
    .single()

  if (!subscriber) {
    return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
  }

  const isPaid = subscriber.tier === 'paid'

  // Update core fields
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (preferences.zip_code !== undefined) updates.zip_code = preferences.zip_code
  if (preferences.send_day && isPaid) updates.send_day = preferences.send_day
  if (preferences.min_discount && isPaid) updates.min_discount = preferences.min_discount
  if (preferences.gender_filter !== undefined) updates.gender_filter = preferences.gender_filter
  // spend_tier_filter available to all users
  if (preferences.spend_tier_filter !== undefined) updates.spend_tier_filter = preferences.spend_tier_filter
  // subscription_mode only for paid; free is always 'category'
  if (preferences.subscription_mode !== undefined && isPaid) {
    updates.subscription_mode = preferences.subscription_mode
  }

  await service.from('subscribers').update(updates).eq('id', subscriber.id)

  // Update categories (free tier restricted)
  if (preferences.categories) {
    const rows = Object.entries(preferences.categories).map(([cat, enabled]) => ({
      subscriber_id: subscriber.id,
      category: cat,
      enabled: !isPaid && !['fashion', 'restaurants', 'grocery'].includes(cat)
        ? false
        : Boolean(enabled),
    }))

    await service
      .from('subscriber_categories')
      .upsert(rows, { onConflict: 'subscriber_id,category' })
  }

  // Update deal types (paid only)
  if (preferences.deal_types && isPaid) {
    const rows = Object.entries(preferences.deal_types).map(([dt, enabled]) => ({
      subscriber_id: subscriber.id,
      deal_type: dt,
      enabled: Boolean(enabled),
    }))

    await service
      .from('subscriber_deal_types')
      .upsert(rows, { onConflict: 'subscriber_id,deal_type' })
  }

  // Update selected retailers (paid only)
  if (preferences.selected_retailers !== undefined && isPaid) {
    // Delete all existing retailer prefs for this subscriber, re-insert
    await service
      .from('subscriber_retailers')
      .delete()
      .eq('subscriber_id', subscriber.id)

    if (preferences.selected_retailers.length > 0) {
      const rows = preferences.selected_retailers.map((retailer) => ({
        subscriber_id: subscriber.id,
        retailer,
        enabled: true,
      }))
      await service.from('subscriber_retailers').insert(rows)
    }
  }

  return NextResponse.json({ success: true })
}
