// Shared helper for sending a watchlist email to one subscriber.
//
// Used by:
//   - /api/deals/refresh   (on-demand, user-triggered)
//   - /api/cron/weekly     (Thursday cron, all-subscribers)
//
// The logic — load watches, pull recent non-expired deals, filter per watch,
// rank, generate the email, send via Resend, bump per-watch
// last_email_sent_at — lives in exactly one place so the on-demand and
// scheduled paths can't drift apart.

import { format } from 'date-fns'
import type { Deal } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/resend'
import {
  generateWatchlistEmail,
  generateEmptyWatchlistNudgeEmail,
  type WatchSection,
} from '@/lib/watchlistEmailGenerator'
import { rankDeals, isJunkDeal } from '@/lib/deals'
import { fetchStoreData } from '@/lib/stores'

const LOOKBACK_DAYS = 14
const MAX_DEALS_PER_WATCH = 15

export interface WatchlistSendResult {
  sent: boolean
  reason?: string                 // e.g. 'email_send_failed'
  was_empty_nudge: boolean        // true if subscriber had 0 watches
  watches_count: number
  total_deals: number
  breakdown: Array<{ watch: string; deals: number }>
}

interface WatchRow {
  id: string
  category_slug: string
  sub_type: string | null
  gender: string | null
  min_price_tier: string | null
  category_label: string
}

export async function sendWatchlistEmailForSubscriber(
  service: SupabaseClient,
  appUrl: string,
  subscriber: { id: string; email: string },
): Promise<WatchlistSendResult> {
  // ── Load watches ─────────────────────────────────────────────────────
  const { data: watchRows } = await service
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

  const watches: WatchRow[] = (watchRows ?? []).map((w) => {
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

  // ── Empty watchlist → send nudge email ───────────────────────────────
  if (watches.length === 0) {
    const html = generateEmptyWatchlistNudgeEmail({ appUrl })
    const result = await sendEmail({
      to: subscriber.email,
      subject: 'Tell us what you’re shopping for',
      html,
    })
    return {
      sent: !!result,
      reason: result ? undefined : 'email_send_failed',
      was_empty_nudge: true,
      watches_count: 0,
      total_deals: 0,
      breakdown: [],
    }
  }

  // ── Pull recent non-expired deals once, filter per-watch in memory ──
  const sinceIso = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: dealRows } = await service
    .from('deals')
    .select('*')
    .gte('created_at', sinceIso)
    .or(`expiration_date.is.null,expiration_date.gte.${today}`)

  const allDeals = (dealRows ?? []).filter((d): d is Deal => !isJunkDeal(d as Deal))

  const { storeTiers } = await fetchStoreData(appUrl)

  const watchSections: WatchSection[] = watches.map((w) => {
    const matching = allDeals.filter((d) => {
      const cats = (d.categories ?? []) as string[]
      if (!cats.includes(w.category_slug)) return false
      if (w.sub_type && d.deal_subtype !== w.sub_type) return false
      return true
    })
    const ranked = rankDeals(matching, storeTiers).slice(0, MAX_DEALS_PER_WATCH)
    const label = w.sub_type
      ? `${w.category_label} — ${w.sub_type}`
      : w.category_label
    return { label, deals: ranked }
  })

  const totalDeals = watchSections.reduce((sum, s) => sum + s.deals.length, 0)
  const html = generateWatchlistEmail({ appUrl, watchSections })

  const result = await sendEmail({
    to: subscriber.email,
    subject: totalDeals > 0
      ? `${totalDeals} ${totalDeals === 1 ? 'deal' : 'deals'} for your watchlist`
      : 'Still watching your watchlist',
    html,
  })

  // ── Bump per-watch last_email_sent_at on success ─────────────────────
  if (result) {
    const nowIso = new Date().toISOString()
    await service
      .from('subscriber_watches')
      .update({ last_email_sent_at: nowIso })
      .in('id', watches.map((w) => w.id))
  }

  return {
    sent: !!result,
    reason: result ? undefined : 'email_send_failed',
    was_empty_nudge: false,
    watches_count: watches.length,
    total_deals: totalDeals,
    breakdown: watchSections.map((s) => ({ watch: s.label, deals: s.deals.length })),
  }
}
