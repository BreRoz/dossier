import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Category, SendDay } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { categories, send_day } = await req.json()

  // Get subscriber
  const { data: sub } = await supabase
    .from('subscribers')
    .select('id, tier')
    .eq('email', user.email)
    .single()

  if (!sub) return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })

  // Save category preferences
  if (categories && typeof categories === 'object') {
    const rows = Object.entries(categories).map(([cat, enabled]) => ({
      subscriber_id: sub.id,
      category: cat as Category,
      enabled: sub.tier === 'free'
        ? ['fashion', 'grocery', 'restaurants'].includes(cat) ? enabled : false
        : Boolean(enabled),
    }))
    await supabase
      .from('subscriber_categories')
      .upsert(rows, { onConflict: 'subscriber_id,category' })
  }

  // Save send day (free tier locked to thursday)
  const effectiveDay: SendDay = sub.tier === 'free' ? 'thursday' : (send_day || 'thursday')
  await supabase
    .from('subscribers')
    .update({ send_day: effectiveDay, onboarding_completed: true })
    .eq('id', sub.id)

  return NextResponse.json({ success: true })
}
