import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Paid tier only
  const { data: sub } = await supabase
    .from('subscribers')
    .select('id, tier')
    .eq('email', user.email)
    .single()

  if (!sub) return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
  if (sub.tier !== 'paid') return NextResponse.json({ error: 'Paid tier required' }, { status: 403 })

  const { store_name, website, category, notes } = await req.json()
  if (!store_name?.trim()) return NextResponse.json({ error: 'Store name required' }, { status: 400 })

  const { error } = await supabase.from('store_suggestions').insert({
    subscriber_id: sub.id,
    store_name: store_name.trim(),
    website: website?.trim() || null,
    category: category?.trim() || null,
    notes: notes?.trim() || null,
  })

  if (error) {
    console.error('store suggestion error:', error)
    return NextResponse.json({ error: 'Failed to submit suggestion' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
