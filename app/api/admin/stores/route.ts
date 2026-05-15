// Admin CRUD for the brand directory.
//
// GET    /api/admin/stores      → list all (active + inactive, with search)
// POST   /api/admin/stores      → create
//
// Per-row PATCH and DELETE live under /api/admin/stores/[id].
//
// Admin gate: ADMIN_EMAIL must match the authenticated user. Without an
// admin email set in the environment, every request 401s — fail closed.

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function requireAdmin(): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || !user || user.email !== adminEmail) {
    return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { ok: true }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const url = new URL(request.url)
  const search = url.searchParams.get('q')?.trim() ?? ''

  const service = createServiceClient()
  const safeSearch = search ? search.replace(/[\\%_]/g, '\\$&') : null

  // Primary path: post-019 schema with status column.
  let primaryQuery = service
    .from('stores')
    .select(
      'id, name, website, categories, sub_types, price_tier, is_active, status, age_group, affiliate_id, date_added, updated_at'
    )
    .order('name', { ascending: true })
  if (safeSearch) primaryQuery = primaryQuery.ilike('name', `%${safeSearch}%`)
  const primary = await primaryQuery

  if (!primary.error) {
    return NextResponse.json({ stores: primary.data ?? [] })
  }

  // 42703 = column doesn't exist → migration 019 not applied yet. Fall
  // back to the pre-019 query so the admin UI works during the gap.
  if ((primary.error as { code?: string }).code === '42703') {
    console.warn('[admin stores] status column missing — falling back. Run migration 019.')
    let fallbackQuery = service
      .from('stores')
      .select(
        'id, name, website, categories, sub_types, price_tier, is_active, age_group, affiliate_id, date_added, updated_at'
      )
      .order('name', { ascending: true })
    if (safeSearch) fallbackQuery = fallbackQuery.ilike('name', `%${safeSearch}%`)
    const fallback = await fallbackQuery
    if (fallback.error) {
      console.error('[admin stores] fallback error:', JSON.stringify(fallback.error))
      return NextResponse.json({ error: 'Failed to load stores' }, { status: 500 })
    }
    const stores = (fallback.data ?? []).map((s) => ({
      ...s,
      status: s.is_active ? 'active' : 'pending',
    }))
    return NextResponse.json({ stores })
  }

  console.error('[admin stores] list error:', JSON.stringify(primary.error))
  return NextResponse.json({ error: 'Failed to load stores' }, { status: 500 })
}

interface StoreInput {
  name?: string
  website?: string
  categories?: string[]
  sub_types?: string[]
  price_tier?: string | null
  is_active?: boolean
  status?: string
  age_group?: string | null
  affiliate_id?: string | null
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  let body: StoreInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = body.name?.trim()
  const website = body.website?.trim()
  if (!name || !website) {
    return NextResponse.json({ error: 'name and website are required' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('stores')
    .insert({
      name,
      website,
      categories: body.categories ?? [],
      sub_types: body.sub_types ?? [],
      price_tier: body.price_tier ?? null,
      // Keep is_active + status in sync. If caller sent status, derive
      // is_active. Else trust whatever's there.
      is_active: body.status ? body.status === 'active' : (body.is_active ?? true),
      status: body.status ?? (body.is_active === false ? 'pending' : 'active'),
      age_group: body.age_group ?? null,
      affiliate_id: body.affiliate_id ?? null,
    })
    .select()
    .single()

  if (error) {
    const code = (error as { code?: string }).code
    if (code === '23505') {
      return NextResponse.json({ error: 'A store with that website already exists' }, { status: 409 })
    }
    console.error('[admin stores] create error:', JSON.stringify(error))
    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 })
  }

  return NextResponse.json({ store: data })
}
