import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { generateEmailHTML } from '@/lib/emailGenerator'
import { filterDealsForSubscriber, getCurrentWeekOf, rankDeals } from '@/lib/deals'
import { format } from 'date-fns'
import type { Deal, Subscriber, Edition, Category, DealType } from '@/types'
import { FREE_CATEGORIES } from '@/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Admin only
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!user || (adminEmail && user.email !== adminEmail)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dealdossier.io'

  // Find the subscriber record for the logged-in admin
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('*')
    .eq('email', user.email)
    .single()

  if (!subscriber) {
    return NextResponse.json({ error: `No subscriber found for ${user.email}` }, { status: 404 })
  }

  const weekOf = getCurrentWeekOf('thursday')
  const weekOfStr = format(weekOf, 'yyyy-MM-dd')

  const { data: allDeals } = await supabase
    .from('deals')
    .select('*')
    .eq('week_of', weekOfStr)

  if (!allDeals || allDeals.length === 0) {
    return NextResponse.json({ error: `No deals found for week_of ${weekOfStr}` }, { status: 404 })
  }

  let { data: edition } = await supabase
    .from('editions')
    .select('*')
    .eq('week_of', weekOfStr)
    .single()

  if (!edition) {
    return NextResponse.json({ error: 'No edition found for this week' }, { status: 404 })
  }

  // Fetch subscriber preferences
  const [{ data: cats }, { data: dts }, { data: retailers }] = await Promise.all([
    supabase.from('subscriber_categories').select('*').eq('subscriber_id', subscriber.id),
    supabase.from('subscriber_deal_types').select('*').eq('subscriber_id', subscriber.id),
    supabase.from('subscriber_retailers').select('retailer').eq('subscriber_id', subscriber.id).eq('enabled', true),
  ])

  const enabledCategories = (cats || []).filter((c) => c.enabled).map((c) => c.category as Category)
  const enabledDealTypes = (dts || []).filter((d) => d.enabled).map((d) => d.deal_type as DealType)
  const selectedRetailers = (retailers || []).map((r: { retailer: string }) => r.retailer)

  const effectiveCategories = subscriber.tier === 'free'
    ? enabledCategories.filter((c) => FREE_CATEGORIES.includes(c))
    : enabledCategories

  const effectiveMinDiscount = subscriber.tier === 'free' ? 40 : subscriber.min_discount
  const subscriptionMode = subscriber.tier === 'free' ? 'category' : (subscriber.subscription_mode ?? 'category')
  const genderFilter: string[] = (subscriber.gender_filter as string[]) ?? ['men', 'women', 'unisex']
  const excludeFreeShipping = subscriber.tier === 'paid'

  const subscriberDeals = filterDealsForSubscriber(
    allDeals as Deal[],
    effectiveMinDiscount,
    effectiveCategories,
    enabledDealTypes,
    weekOf,
    { genderFilter, subscriptionMode, selectedRetailers, excludeFreeShipping }
  )

  const rankedDeals = rankDeals(subscriberDeals)

  // Fetch store URLs
  let storeUrls: Record<string, string> = {}
  try {
    const res = await fetch(`${appUrl}/api/stores`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const { stores } = await res.json()
      for (const store of stores ?? []) {
        if (!store.name || !store.website) continue
        const url = store.website.startsWith('http') ? store.website : `https://${store.website}`
        storeUrls[store.name.toLowerCase()] = url
        storeUrls[store.name.toLowerCase().replace(/[^a-z0-9]/g, '')] = url
      }
    }
  } catch {}

  const html = generateEmailHTML({
    subscriber: subscriber as Subscriber,
    deals: rankedDeals,
    edition: edition as Edition,
    enabledCategories: effectiveCategories,
    totalDeals: allDeals.length,
    appUrl,
    storeUrls,
  })

  const weekLabel = format(weekOf, 'MMMM d')
  const result = await sendEmail({
    to: subscriber.email,
    subject: `[PREVIEW] Deal Dossier: ${weekLabel}`,
    html,
  })

  if (!result) {
    return NextResponse.json({ error: 'Failed to send preview email' }, { status: 500 })
  }

  return NextResponse.json({
    sent_to: subscriber.email,
    deals_shown: rankedDeals.length,
    week_of: weekOfStr,
  })
}
