// POST /api/deals/refresh
//
// On-demand watchlist email. Looks up the authenticated subscriber's
// active watches, finds current matching deals from the past 14 days,
// and emails them immediately. This is the core of the intent-driven
// model — when someone says "I'm shopping for towels," they get an
// email within seconds because the daily ingest has already built the
// index.

import { NextResponse } from 'next/server'
import type { Deal } from '@/types'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { generateWatchlistEmail, type WatchSection } from '@/lib/watchlistEmailGenerator'
import { rankDeals, isJunkDeal } from '@/lib/deals'
import { fetchStoreData } from '@/lib/stores'

// How far back to surface deals.
const LOOKBACK_DAYS = 14

// Max deals per watch in the email (avoid 100-deal walls of text).
const MAX_DEALS_PER_WATCH = 15

interface WatchRow {
  id: string
  category_slug: string
  sub_type: string | null
  gender: string | null
  min_price_tier: string | null
  // joined fields
  category_label: string
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const service = createServiceClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dealdossier.io'

    // Find the subscriber + their active watches
    const { data: subscriber } = await service
      .from('subscribers')
      .select('id, email')
      .eq('email', user.email)
      .single()

    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    const { data: watchRows, error: watchErr } = await service
      .from('subscriber_watches')
      .select(`
        id,
        category_slug,
        sub_type,
        gender,
        min_price_tier,
        categories!inner(label)
      `)
      .eq('subscriber_id', subscriber.id)

    if (watchErr) {
      console.error('[refresh] watches lookup error:', JSON.stringify(watchErr))
      return NextResponse.json({ error: 'Failed to load watchlist' }, { status: 500 })
    }

    const watches: WatchRow[] = (watchRows ?? []).map((w) => {
      // The "categories" alias on a foreign-key join returns either an object
      // or an array depending on cardinality — flatten either shape.
      const cat = Array.isArray(w.categories) ? w.categories[0] : w.categories
      return {
        id: w.id,
        category_slug: w.category_slug,
        sub_type: w.sub_type,
        gender: w.gender,
        min_price_tier: w.min_price_tier,
        category_label: cat?.label ?? w.category_slug,
      }
    })

    if (watches.length === 0) {
      return NextResponse.json(
        { error: 'No active watches. Add a category to your watchlist first.' },
        { status: 400 }
      )
    }

    // Pull the candidate pool of recent, non-expired deals once. Filter
    // per-watch in memory — cheaper than running 5+ separate DB queries
    // and easier to dedupe deals that span multiple watches.
    const sinceIso = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const today = new Date().toISOString().slice(0, 10)

    const { data: dealRows, error: dealsErr } = await service
      .from('deals')
      .select('*')
      .gte('created_at', sinceIso)
      .or(`expiration_date.is.null,expiration_date.gte.${today}`)

    if (dealsErr) {
      console.error('[refresh] deals lookup error:', JSON.stringify(dealsErr))
      return NextResponse.json({ error: 'Failed to load deals' }, { status: 500 })
    }

    const allDeals = (dealRows ?? []).filter((d): d is Deal => !isJunkDeal(d as Deal))

    // Fetch store metadata for ranking — same as the weekly digest
    const { storeTiers } = await fetchStoreData(appUrl)

    // Build per-watch sections
    const watchSections: WatchSection[] = watches.map((w) => {
      const matching = allDeals.filter((d) => {
        // Primary signal: deal's categories array contains the watched slug
        const cats = (d.categories ?? []) as string[]
        if (!cats.includes(w.category_slug)) return false
        // Optional sub-type filter
        if (w.sub_type && d.deal_subtype !== w.sub_type) return false
        // gender / min_price_tier filters are deferred until Phase 3 UI
        // adds them — keeping the route forwards-compatible.
        return true
      })

      const ranked = rankDeals(matching, storeTiers).slice(0, MAX_DEALS_PER_WATCH)
      const label = w.sub_type
        ? `${w.category_label} — ${w.sub_type}`
        : w.category_label
      return { label, deals: ranked }
    })

    // Generate + send the email
    const html = generateWatchlistEmail({ appUrl, watchSections })
    const totalDeals = watchSections.reduce((sum, s) => sum + s.deals.length, 0)

    const result = await sendEmail({
      to: subscriber.email,
      subject: totalDeals > 0
        ? `${totalDeals} ${totalDeals === 1 ? 'deal' : 'deals'} for your watchlist`
        : 'Still watching your watchlist',
      html,
    })

    if (!result) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    // Bump last_email_sent_at on every watch we just emailed about
    const nowIso = new Date().toISOString()
    await service
      .from('subscriber_watches')
      .update({ last_email_sent_at: nowIso })
      .in('id', watches.map((w) => w.id))

    return NextResponse.json({
      sent: true,
      watches: watches.length,
      total_deals: totalDeals,
      breakdown: watchSections.map((s) => ({ watch: s.label, deals: s.deals.length })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[refresh] handler error:', err)
    return NextResponse.json({ error: `Refresh failed: ${message}` }, { status: 500 })
  }
}
