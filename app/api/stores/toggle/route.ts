import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check tier
  const { data: sub } = await supabase
    .from('subscribers')
    .select('id, tier')
    .eq('email', user.email)
    .single()

  if (!sub) return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
  if (sub.tier !== 'paid') return NextResponse.json({ error: 'Paid tier required' }, { status: 403 })

  const { retailer, enabled } = await req.json()
  if (!retailer || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'Missing retailer or enabled' }, { status: 400 })
  }

  await supabase
    .from('subscriber_store_preferences')
    .upsert(
      { subscriber_id: sub.id, retailer, enabled },
      { onConflict: 'subscriber_id,retailer' }
    )

  return NextResponse.json({ success: true })
}
