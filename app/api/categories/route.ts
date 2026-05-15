// GET /api/categories — public list of active categories.
// Used by the watchlist UI to populate the "add a watch" picker.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const service = createServiceClient()

  // Prefer the grouped query; fall back to the pre-015 schema if the
  // group_name column hasn't been added yet. Lets the UI work in either
  // state — clients without groupings just see every category in "Other".
  const tryWithGroup = await service
    .from('categories')
    .select('slug, label, sort_order, group_name')
    .eq('is_active', true)
    .order('sort_order')

  if (!tryWithGroup.error) {
    return NextResponse.json({ categories: tryWithGroup.data ?? [] })
  }

  // 42703 = column does not exist. Anything else is a real failure.
  const code = (tryWithGroup.error as { code?: string }).code
  if (code !== '42703') {
    console.error('[categories] lookup error:', JSON.stringify(tryWithGroup.error))
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
  }

  console.warn('[categories] group_name column missing — falling back. Run migration 015.')
  const fallback = await service
    .from('categories')
    .select('slug, label, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  if (fallback.error) {
    console.error('[categories] fallback error:', JSON.stringify(fallback.error))
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
  }
  return NextResponse.json({ categories: fallback.data ?? [] })
}
