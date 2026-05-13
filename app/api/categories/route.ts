// GET /api/categories — public list of active categories.
// Used by the watchlist UI to populate the "add a watch" picker.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const service = createServiceClient()
  const { data, error } = await service
    .from('categories')
    .select('slug, label, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    console.error('[categories] lookup error:', JSON.stringify(error))
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
  }

  return NextResponse.json({ categories: data ?? [] })
}
