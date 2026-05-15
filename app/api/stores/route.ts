// Public brand directory.
//
// Returns every store EXCEPT 'declined' rows. /suggest uses this to
// power its autofill — and the autofill needs to know about pending +
// no_email stores too, so it can tell the user "we have that brand in
// our directory but no email yet" or "we checked, they don't have a
// promo list, sorry." Only 'declined' is hidden — those should not
// even surface as autofill matches.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const revalidate = 300

export interface StoreRow {
  id: string
  name: string
  website: string
  categories: string[]
  sub_types: string[]
  price_tier: string | null
  age_group: string | null
  date_added: string
  status: string
  is_active: boolean
}

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('stores')
    .select(
      'id, name, website, categories, sub_types, price_tier, age_group, date_added, status, is_active'
    )
    .neq('status', 'declined')
    .order('name', { ascending: true })

  if (error) {
    // status column missing → migration 019 not applied yet. Fall back
    // to the pre-019 query so the autofill keeps working during the
    // mid-deploy gap.
    const code = (error as { code?: string }).code
    if (code === '42703') {
      console.warn('[stores] status column missing — falling back. Run migration 019.')
      const fallback = await supabase
        .from('stores')
        .select('id, name, website, categories, sub_types, price_tier, age_group, date_added, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (fallback.error) {
        console.error('[stores] fallback error:', JSON.stringify(fallback.error))
        return NextResponse.json({ stores: [], error: 'Failed to load stores' }, { status: 200 })
      }
      const stores = (fallback.data ?? []).map((s) => ({ ...s, status: 'active' }))
      return NextResponse.json({ stores })
    }
    console.error('[stores] lookup error:', JSON.stringify(error))
    return NextResponse.json({ stores: [], error: 'Failed to load stores' }, { status: 200 })
  }

  return NextResponse.json({ stores: data ?? [] })
}
