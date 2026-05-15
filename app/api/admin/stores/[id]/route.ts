// Per-store admin operations:
// PATCH  /api/admin/stores/[id]  → partial update
// DELETE /api/admin/stores/[id]  → soft delete (is_active = false)
//
// Soft delete because /suggest's "already tracked" autofill should keep
// matching against deactivated brands too — we just hide them from the
// public stores response and the ingest pipeline.

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

interface StoreUpdate {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  let body: StoreUpdate
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Whitelist updatable columns — silently drops unknown keys so a stale
  // client can't write to columns that didn't exist when the form was
  // designed.
  const update: Record<string, unknown> = {}
  for (const key of [
    'name', 'website', 'categories', 'sub_types', 'price_tier',
    'is_active', 'status', 'age_group', 'affiliate_id',
  ] as const) {
    if (key in body) update[key] = body[key]
  }
  // Keep is_active and status in sync if either was sent. status wins
  // when both are present.
  if ('status' in body) {
    update.is_active = body.status === 'active'
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('stores')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    const code = (error as { code?: string }).code
    if (code === '23505') {
      return NextResponse.json({ error: 'Another store already uses that website' }, { status: 409 })
    }
    console.error('[admin stores] update error:', JSON.stringify(error))
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 })
  }

  return NextResponse.json({ store: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const service = createServiceClient()
  // Soft delete — the row stays around so /suggest's "is this already
  // tracked?" check still matches it. Hard delete is available via the
  // SQL editor if you genuinely need to purge.
  const { error } = await service
    .from('stores')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    console.error('[admin stores] delete error:', JSON.stringify(error))
    return NextResponse.json({ error: 'Failed to delete store' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
