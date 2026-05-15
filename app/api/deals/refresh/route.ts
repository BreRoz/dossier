// POST /api/deals/refresh
//
// On-demand watchlist email. The authenticated subscriber asks for an
// update; we pull their current matching deals and email them right
// away. Core of the intent-driven model — when someone hits "send me
// deals now" before they head out shopping, they get a fresh email
// within seconds because the daily ingest has already built the index.
//
// Shares its core logic with the weekly Thursday cron via
// lib/watchlistSend.ts so the on-demand and scheduled paths can't
// drift apart.

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendWatchlistEmailForSubscriber } from '@/lib/watchlistSend'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const service = createServiceClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dealdossier.io'

    const { data: subscriber } = await service
      .from('subscribers')
      .select('id, email')
      .eq('email', user.email)
      .single()

    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    const result = await sendWatchlistEmailForSubscriber(service, appUrl, subscriber)

    if (!result.sent) {
      return NextResponse.json(
        { error: 'Failed to send email', reason: result.reason },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sent: true,
      watches: result.watches_count,
      total_deals: result.total_deals,
      was_nudge: result.was_empty_nudge,
      breakdown: result.breakdown,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[refresh] handler error:', err)
    return NextResponse.json({ error: `Refresh failed: ${message}` }, { status: 500 })
  }
}
