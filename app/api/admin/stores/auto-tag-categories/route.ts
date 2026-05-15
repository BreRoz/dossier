// POST /api/admin/stores/auto-tag-categories
//
// Walks every store with an empty categories[] and asks GPT what
// categories (from the active 61-slug taxonomy) that brand sells. Writes
// the result back to stores.categories. Idempotent: stores that already
// have categories assigned are skipped, so re-running the endpoint only
// fills in the gaps.
//
// Admin-gated. Runs serverside with concurrency-limited workers so we
// don't blast OpenAI's rate limit on a large directory.

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getRetailerCategories, type CategoryRow } from '@/lib/openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CONCURRENCY = 4

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let index = 0
  const next = async (): Promise<void> => {
    while (true) {
      const i = index++
      if (i >= items.length) return
      try {
        await worker(items[i])
      } catch (err) {
        console.error(`[auto-tag] worker error on item ${i}:`, err)
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => next())
  )
}

export async function POST(request: NextRequest) {
  // Admin gate
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || !user || user.email !== adminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Optional `?force=1` re-tags EVERY store, even ones that already have
  // categories. Default behavior only fills empty ones, which is what
  // you'll want 99% of the time.
  const url = new URL(request.url)
  const force = url.searchParams.get('force') === '1'

  const service = createServiceClient()

  // Pull the active taxonomy once (shared across all worker calls).
  const { data: categoryRows } = await service
    .from('categories')
    .select('slug, label')
    .eq('is_active', true)
    .order('sort_order')
  const allCategories: CategoryRow[] = categoryRows ?? []
  if (allCategories.length === 0) {
    return NextResponse.json(
      { error: 'No active categories found — seed the categories table first.' },
      { status: 500 }
    )
  }

  // Targets: active stores. Default filters to ones with no categories
  // yet so re-running is cheap; force=1 hits everyone.
  let query = service
    .from('stores')
    .select('id, name, categories')
    .eq('is_active', true)
  if (!force) {
    // categories is TEXT[] with default {}. Match the empty-array state.
    query = query.eq('categories', '{}')
  }
  const { data: stores, error } = await query
  if (error) {
    console.error('[auto-tag] fetch error:', JSON.stringify(error))
    return NextResponse.json({ error: 'Failed to load stores' }, { status: 500 })
  }
  if (!stores || stores.length === 0) {
    return NextResponse.json({
      tagged: 0,
      skipped_unknown: 0,
      total: 0,
      message: 'No stores needed tagging',
    })
  }

  let tagged = 0
  let skippedUnknown = 0

  await runWithConcurrency(stores, CONCURRENCY, async (store) => {
    const cats = await getRetailerCategories(store.name, allCategories)
    if (cats.length === 0) {
      skippedUnknown++
      console.log(`[auto-tag] LLM returned no categories for "${store.name}" — skipped`)
      return
    }
    const { error: updateErr } = await service
      .from('stores')
      .update({ categories: cats })
      .eq('id', store.id)
    if (updateErr) {
      console.error(`[auto-tag] update error for ${store.name}:`, JSON.stringify(updateErr))
      return
    }
    tagged++
    console.log(`[auto-tag] ${store.name} → [${cats.join(', ')}]`)
  })

  return NextResponse.json({
    tagged,
    skipped_unknown: skippedUnknown,
    total: stores.length,
    force_mode: force,
  })
}
