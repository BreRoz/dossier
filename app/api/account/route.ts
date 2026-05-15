// GET   /api/account  — authenticated subscriber summary (email, tier,
//                       billing-account flag, weekly email opt-in)
// PATCH /api/account  — update the weekly_email_enabled toggle
//
// Replaces the digest-era /api/preferences (which read fields that no
// longer exist on subscribers).

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
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
    .select('tier, subscription_status, stripe_customer_id, weekly_email_enabled')
    .eq('email', user.email)
    .single()

  return NextResponse.json({
    email: user.email,
    tier: subscriber?.tier ?? 'free',
    subscription_status: subscriber?.subscription_status ?? null,
    has_billing_account: !!subscriber?.stripe_customer_id,
    weekly_email_enabled: subscriber?.weekly_email_enabled ?? true,
  })
}

const PatchSchema = z.object({
  weekly_email_enabled: z.boolean(),
})

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = PatchSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('subscribers')
    .update({
      weekly_email_enabled: parsed.data.weekly_email_enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('email', user.email)

  if (error) {
    console.error('[account PATCH] error:', JSON.stringify(error))
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
