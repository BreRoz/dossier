import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // User-scoped client for the auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Service client for the DB read/write so we don't get blocked by RLS
  // on store_suggestions. The auth check above already verifies the
  // request comes from a signed-in subscriber; bypassing RLS for the
  // write is safe.
  const service = createServiceClient()

  const { data: sub } = await service
    .from('subscribers')
    .select('id')
    .eq('email', user.email)
    .single()

  if (!sub) return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })

  const { store_name, website, category, notes } = await req.json()

  if (!store_name?.trim()) {
    return NextResponse.json({ error: 'Store name is required' }, { status: 400 })
  }
  if (!website?.trim()) {
    return NextResponse.json({ error: 'Store website is required' }, { status: 400 })
  }

  const { error } = await service.from('store_suggestions').insert({
    subscriber_id: sub.id,
    store_name: store_name.trim(),
    website: website.trim(),
    category: category?.trim() || null,
    notes: notes?.trim() || null,
  })

  if (error) {
    console.error('store suggestion error:', JSON.stringify(error))
    return NextResponse.json({ error: 'Failed to submit suggestion' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
