import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { generateEmailHTML } from '@/lib/emailGenerator'
import { filterDealsForSubscriber, getCurrentWeekOf, rankDeals } from '@/lib/deals'
import { format } from 'date-fns'
import type { Deal, Subscriber, Edition, Category, DealType, SendDay } from '@/types'
import { FREE_CATEGORIES, ALL_CATEGORIES } from '@/types'

export const maxDuration = 300

const DAYS_OF_WEEK: SendDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET) return true
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = DAYS_OF_WEEK[new Date().getDay()] as SendDay
  const supabase = createServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dossier.email'

  // Get all active subscribers whose send_day is today
  const { data: subscribers } = await supabase
    .from('subscribers')
    .select('*')
    .eq('is_active', true)
    .eq('send_day', today)

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ sent: 0, message: `No subscribers for ${today}` })
  }

  // Get this week's edition and deals
  const weekOf = getCurrentWeekOf(today)
  const weekOfStr = format(weekOf, 'yyyy-MM-dd')

  const { data: edition } = await supabase
    .from('editions')
    .select('*')
    .eq('week_of', weekOfStr)
    .single()

  if (!edition) {
    return NextResponse.json({ sent: 0, message: 'No edition found for this week' })
  }

  const { data: allDeals } = await supabase
    .from('deals')
    .select('*')
    .eq('week_of', weekOfStr)

  if (!allDeals || allDeals.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No deals found for this week' })
  }

  const deals = allDeals as Deal[]

  // Get subscribers who already received this edition
  const { data: alreadySent } = await supabase
    .from('sent_emails')
    .select('subscriber_id')
    .eq('edition_id', edition.id)

  const alreadySentIds = new Set((alreadySent || []).map((s) => s.subscriber_id))

  let sent = 0
  let failed = 0

  // Process in batches to avoid overwhelming Resend
  const batchSize = 10
  const pending = (subscribers as Subscriber[]).filter((s) => !alreadySentIds.has(s.id))

  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize)

    await Promise.all(
      batch.map(async (subscriber) => {
        try {
          // Fetch preferences
          const [{ data: cats }, { data: dts }, { data: retailers }] = await Promise.all([
            supabase.from('subscriber_categories').select('*').eq('subscriber_id', subscriber.id),
            supabase.from('subscriber_deal_types').select('*').eq('subscriber_id', subscriber.id),
            supabase.from('subscriber_retailers').select('retailer').eq('subscriber_id', subscriber.id).eq('enabled', true),
          ])

          const enabledCategories = (cats || [])
            .filter((c) => c.enabled)
            .map((c) => c.category as Category)

          const enabledDealTypes = (dts || [])
            .filter((d) => d.enabled)
            .map((d) => d.deal_type as DealType)

          const selectedRetailers = (retailers || []).map((r: { retailer: string }) => r.retailer)

          // Apply free tier restrictions
          const effectiveCategories =
            subscriber.tier === 'free'
              ? enabledCategories.filter((c) => FREE_CATEGORIES.includes(c))
              : enabledCategories

          const effectiveMinDiscount = subscriber.tier === 'free' ? 40 : subscriber.min_discount

          // Free tier always uses category mode
          const subscriptionMode = subscriber.tier === 'free' ? 'category' : (subscriber.subscription_mode ?? 'category')
          const genderFilter: string[] = (subscriber.gender_filter as string[]) ?? ['men', 'women', 'unisex']

          // Filter deals for this subscriber
          const subscriberDeals = filterDealsForSubscriber(
            deals,
            effectiveMinDiscount,
            effectiveCategories,
            enabledDealTypes,
            weekOf,
            { genderFilter, subscriptionMode, selectedRetailers }
          )

          const rankedDeals = rankDeals(subscriberDeals)
          const dealsShown = rankedDeals.length
          const dealsLocked = deals.length - dealsShown

          const weekLabel = format(weekOf, 'MMMM d')
          const issueNum = edition.issue_number

          const html = generateEmailHTML({
            subscriber,
            deals: rankedDeals,
            edition: edition as Edition,
            enabledCategories: effectiveCategories,
            totalDeals: deals.length,
            appUrl,
          })

          const result = await sendEmail({
            to: subscriber.email,
            subject: `DOSSIER — ${weekLabel}${issueNum ? ` · Issue ${issueNum}` : ''}`,
            html,
          })

          if (result) {
            // Log sent email
            await supabase.from('sent_emails').insert({
              subscriber_id: subscriber.id,
              edition_id: edition.id,
              deals_shown: dealsShown,
              deals_locked: dealsLocked,
            })
            sent++
          } else {
            failed++
          }
        } catch (err) {
          console.error(`Failed to send to ${subscriber.email}:`, err)
          failed++
        }
      })
    )

    // Small delay between batches
    if (i + batchSize < pending.length) {
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  return NextResponse.json({
    day: today,
    week_of: weekOfStr,
    total_subscribers: pending.length,
    sent,
    failed,
  })
}
