import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Any signed-in subscriber can suggest a store — free or paid. Every
  // submission is manually reviewed before a brand is added, so opening
  // this up just widens the funnel of brands we hear about.
  const { data: sub } = await supabase
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

  const { error } = await supabase.from('store_suggestions').insert({
    subscriber_id: sub.id,
    store_name: store_name.trim(),
    website: website.trim(),
    category: category?.trim() || null,
    notes: notes?.trim() || null,
  })

  if (error) {
    console.error('store suggestion error:', JSON.stringify(error))
    // Surface the real DB error to the client during debugging.
    // Auth-gated route, so leaking the Postgres code is acceptable.
    return NextResponse.json(
      {
        error: `DB error [${error.code}]: ${error.message}${error.hint ? ` (hint: ${error.hint})` : ''}`,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
