// GET /api/account — minimal authenticated subscriber summary.
// Used by the watchlist UI to show tier + email. Replaces the removed
// /api/preferences endpoint, which served digest-era preferences that
// no longer exist.

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: subscriber } = await service
    .from('subscribers')
    .select('tier, subscription_status, stripe_customer_id')
    .eq('email', user.email)
    .single()

  return NextResponse.json({
    email: user.email,
    tier: subscriber?.tier ?? 'free',
    subscription_status: subscriber?.subscription_status ?? null,
    has_billing_account: !!subscriber?.stripe_customer_id,
  })
}
