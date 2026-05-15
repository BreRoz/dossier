// GET /api/cron/weekly
//
// Thursday-morning retention email. Loops over every active subscriber
// who has weekly_email_enabled = true AND hasn't been sent a weekly in
// the last 6+ days. Sends one of two things:
//
//   - If the subscriber has ≥1 watch → their watchlist deals email
//     (same template as on-demand refresh).
//   - If the subscriber has 0 watches → a "set up your watchlist"
//     nudge email pointing them at /preferences.
//
// The 6-day dedup window via subscribers.last_weekly_email_at means
// re-running the cron (manual trigger from /admin, accidental double-
// schedule, etc.) can't double-send.
//
// Hard-capped at 5 minutes via Vercel's maxDuration. Processes
// subscribers in serial with a small inter-send delay so we don't trip
// Resend's per-second rate limit on lists that have grown large.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendAdminAlert } from '@/lib/resend'
import { sendWatchlistEmailForSubscriber } from '@/lib/watchlistSend'

export const maxDuration = 300

const DEDUP_DAYS = 6
const PER_SEND_DELAY_MS = 120

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dealdossier.io'

  // Eligible: active, weekly opt-in true, not sent in the last DEDUP_DAYS
  // days (or never sent at all). Using >= instead of > is intentional —
  // a cron that fires twice in the same minute would still see the second
  // run's window-check fail.
  const cutoffIso = new Date(Date.now() - DEDUP_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: subscribers, error } = await service
    .from('subscribers')
    .select('id, email, last_weekly_email_at')
    .eq('is_active', true)
    .eq('weekly_email_enabled', true)
    .or(`last_weekly_email_at.is.null,last_weekly_email_at.lt.${cutoffIso}`)

  if (error) {
    console.error('[weekly] subscriber lookup error:', JSON.stringify(error))
    await sendAdminAlert({
      subject: '🚨 Deal Dossier — weekly send failed at lookup',
      body: `Could not load eligible subscribers:\n\n${JSON.stringify(error)}`,
    })
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }

  const eligible = subscribers ?? []
  let watchlistSent = 0
  let nudgeSent = 0
  let failed = 0

  for (const subscriber of eligible) {
    try {
      const result = await sendWatchlistEmailForSubscriber(service, appUrl, {
        id: subscriber.id,
        email: subscriber.email,
      })

      if (result.sent) {
        if (result.was_empty_nudge) nudgeSent++
        else watchlistSent++

        // Bump the dedup timestamp only on a successful send. A failed
        // send leaves last_weekly_email_at as-is so the next run retries.
        await service
          .from('subscribers')
          .update({ last_weekly_email_at: new Date().toISOString() })
          .eq('id', subscriber.id)
      } else {
        failed++
        console.error(`[weekly] send failed for ${subscriber.email}: ${result.reason ?? 'unknown'}`)
      }
    } catch (err) {
      failed++
      console.error(`[weekly] handler error for ${subscriber.email}:`, err)
    }

    // Gentle pacing so Resend's 10/sec rate limit doesn't bite on
    // larger lists. 120ms = ~8 sends/sec, comfortably under the cap.
    if (PER_SEND_DELAY_MS > 0) {
      await new Promise((r) => setTimeout(r, PER_SEND_DELAY_MS))
    }
  }

  return NextResponse.json({
    eligible: eligible.length,
    watchlist_sent: watchlistSent,
    nudge_sent: nudgeSent,
    failed,
  })
}
