import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchPromotionalEmails } from '@/lib/gmail'
import { extractDealsFromEmail, getRetailerCategories, type CategoryRow } from '@/lib/openai'
import { getCurrentWeekOf, makeDealKey, isJunkDeal } from '@/lib/deals'
import { fixRetailerCase } from '@/lib/stores'
import { sendAdminAlert } from '@/lib/resend'
import { format, subHours } from 'date-fns'
import type { Category } from '@/types'

export const maxDuration = 300 // 5 minute max

// Extract display name from "Store Name <email@domain.com>" format
function parseSenderName(from: string): string {
  const match = from.match(/^([^<]+)</)
  if (match) return match[1].trim()
  return from.split('@')[0].trim()
}

// Normalize a retailer name for fuzzy matching against stores.name.
// Lowercases and strips everything that isn't a letter or digit, so
// "J.Crew", "J. Crew", and "jcrew" all collapse to "jcrew".
function normalizeRetailer(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Quickly skip obvious transactional emails before hitting OpenAI.
// These will never contain deals worth publishing.
const TRANSACTIONAL_SUBJECT_RE = /\b(order\s+(confirmation|#\s*\d|number|receipt|summary|update)|your\s+(order|receipt|invoice|shipment|package)|has\s+shipped|order\s+shipped|out\s+for\s+delivery|delivery\s+(update|notification|confirmed|exception)|track\s+(your\s+)?(order|package|shipment)|shipping\s+(update|notification|confirmation)|password\s+reset|verify\s+(your\s+)?email|security\s+(alert|code|notice)|account\s+(update|notice|alert|created|activated))\b/i

function isTransactionalEmail(subject: string): boolean {
  return TRANSACTIONAL_SUBJECT_RE.test(subject)
}

// Process emails concurrently so the cron doesn't time out on large inboxes.
// Tunable via INGEST_CONCURRENCY env var; default 5 keeps us comfortably under
// OpenAI's 200K tokens-per-minute cap on gpt-4o-mini.
const INGEST_CONCURRENCY = Math.max(
  1,
  Number(process.env.INGEST_CONCURRENCY) || 5
)

// Hard cap on emails processed per run. Vercel's serverless function limit is
// 5 minutes; a fresh inbox with weeks of accumulated subs can have hundreds of
// promo emails in the 24-hour IMAP window. Capping per-run lets each invocation
// finish reliably — the hourly cron clears the backlog in a handful of runs.
// Tunable via INGEST_MAX_PER_RUN env var.
const INGEST_MAX_PER_RUN = Math.max(
  1,
  Number(process.env.INGEST_MAX_PER_RUN) || 30
)

// Queue-based worker pool. Unlike batched Promise.all, a new task starts the
// moment any worker frees up — no head-of-line blocking when one email's
// OpenAI call is slow.
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
        console.error(`[ingest] worker error on item ${i}:`, err)
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => next())
  )
}

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const weekOf = getCurrentWeekOf()
  const weekOfStr = format(weekOf, 'yyyy-MM-dd')

  // Fallback date window. Only used if the IMAP UID cursor is missing
  // (very first run) or invalidated by a UIDVALIDITY change. Steady-state
  // hourly runs never look at this — they pick up at `UID > last_uid`.
  const since = subHours(new Date(), 24)

  try {
    // Read the IMAP cursor. {uid_validity, last_uid} from ingest_state.
    // First-ever run: last_uid=0 (the table default), uidValidity unknown
    // → falls back to date window, which is fine.
    const { data: cursorRow } = await supabase
      .from('ingest_state')
      .select('uid_validity, last_uid')
      .eq('id', 'singleton')
      .maybeSingle()

    const cursor = {
      afterUid: Number(cursorRow?.last_uid ?? 0),
      uidValidity: cursorRow?.uid_validity != null
        ? Number(cursorRow.uid_validity)
        : undefined,
    }

    const tFetchStart = Date.now()
    const fetchResult = await fetchPromotionalEmails(since, cursor)
    const emails = fetchResult.messages
    console.log(
      `[ingest] IMAP fetch: ${emails.length} new messages in ${Date.now() - tFetchStart}ms ` +
        `(cursor: afterUid=${cursor.afterUid}, uidValidity=${cursor.uidValidity ?? 'none'} → maxUid=${fetchResult.maxUid}, uidValidity=${fetchResult.uidValidity})`
    )
    if (emails.length === 0) {
      // Even with zero new messages we advance uid_validity if it changed
      // — keeps the cursor pinned to the right mailbox generation.
      if (fetchResult.uidValidity && fetchResult.uidValidity !== cursor.uidValidity) {
        await supabase
          .from('ingest_state')
          .update({ uid_validity: fetchResult.uidValidity, updated_at: new Date().toISOString() })
          .eq('id', 'singleton')
      }
      return NextResponse.json({ emails: 0, new_deals: 0 })
    }

    // Fetch the active category list once per run so the LLM prompt can be
    // built with the current taxonomy. Adding/removing categories in the
    // DB takes effect on the next ingest run — no code deploy.
    const { data: categoryRows } = await supabase
      .from('categories')
      .select('slug, label')
      .eq('is_active', true)
      .order('sort_order')
    const allCategories: CategoryRow[] = categoryRows ?? []

    // Pull the brand directory once per run and index it by normalized
    // name. When a deal comes in from a known brand, its admin-tagged
    // store.categories get unioned into the deal's category list — so a
    // "winter coats" deal from J.Crew lands under outerwear-and-coats
    // (LLM extraction, deal-specific) AND womens-clothes / mens-clothes
    // (store curation, general brand coverage). Anyone watching any of
    // those slugs sees the deal.
    // Pull ALL stores (active + pending) so we can:
    //   1. Route deals into store-curated categories (active path)
    //   2. Auto-activate pending stores when their first email arrives
    //      (so the directory self-validates — pending = "we suspect they
    //      send promo email" → confirmed when ingest sees one)
    const { data: storeRows } = await supabase
      .from('stores')
      .select('id, name, categories, is_active, status')
    interface StoreMatch {
      id: string
      categories: string[]
      is_active: boolean
      status: string
    }
    const storesByName = new Map<string, StoreMatch>()
    for (const row of storeRows ?? []) {
      if (!row.name) continue
      storesByName.set(normalizeRetailer(row.name), {
        id: row.id,
        categories: Array.isArray(row.categories) ? row.categories : [],
        is_active: row.is_active,
        // Older rows from before migration 019 may not have a status —
        // default to 'pending' so they still auto-activate on first deal.
        status: row.status ?? 'pending',
      })
    }
    const activeCount = Array.from(storesByName.values()).filter((s) => s.is_active).length
    console.log(
      `[ingest] loaded ${storesByName.size} stores (${activeCount} active, ${storesByName.size - activeCount} inactive) for routing + auto-activation`
    )

    // In-memory cache of retailers already known to the retailer_categories
    // table. Avoids duplicate LLM calls within a single run when multiple
    // emails come from the same retailer.
    const retailerCategoriesCache = new Map<string, boolean>()

    // Per-run cap: process oldest-UID-first so the cursor advances
    // monotonically. Anything not processed this run picks up next hour at
    // `UID > <max processed UID>`. Sorting by UID (not date) keeps the
    // cursor semantically correct.
    const newEmails = emails
      .slice()
      .sort((a, b) => a.uid - b.uid)
      .slice(0, INGEST_MAX_PER_RUN)

    const deferred = emails.length - newEmails.length
    console.log(
      `[ingest] cap: ${emails.length} new → ${newEmails.length} processing this run` +
        (deferred > 0 ? ` (${deferred} deferred to next run)` : '')
    )

    // Build a set of already-seen deal keys this week so we never insert
    // the same sale twice even if 3 emails announce it
    const { data: existingDealsThisWeek } = await supabase
      .from('deals')
      .select('retailer, deal_type, percent_off, promo_code, description')
      .eq('week_of', weekOfStr)

    const seenDealKeys = new Set(
      (existingDealsThisWeek || []).map((d) => makeDealKey(d))
    )

    let newDeals = 0
    let emailsWithDeals = 0
    let emailsWithNoDeals = 0
    const processedEmailIds: string[] = []
    // Track per-email UIDs so we can advance the IMAP cursor only as far as
    // we've successfully processed. If one email fails mid-run, the cursor
    // stays low enough that the next run will retry it.
    const processedUids: number[] = []

    async function processEmail(email: (typeof newEmails)[number]): Promise<void> {
      // Fast-path: skip obviously transactional emails without an OpenAI call
      if (isTransactionalEmail(email.subject)) {
        console.log(`[ingest] skip transactional: "${email.subject}"`)
        await supabase.from('processed_emails').upsert({ email_id: email.id, week_of: weekOfStr })
        processedEmailIds.push(email.id)
        processedUids.push(email.uid)
        return
      }

      const extracted = await extractDealsFromEmail(email.from, email.subject, email.body, allCategories)
      console.log(`[ingest] ${email.from} | subject: ${email.subject} | extracted: ${extracted.length}`)
      if (extracted.length > 0) emailsWithDeals++
      else emailsWithNoDeals++

      for (const deal of extracted) {
        // Skip deals with no real value
        if (!deal.description || !deal.retailer) continue

        // Title-case all-lowercase LLM output ("carter's" → "Carter's")
        // without overriding mixed-case extractions
        const retailer = fixRetailerCase(deal.retailer)
        const normalizedDeal = { ...deal, retailer }

        if (isJunkDeal(normalizedDeal)) {
          console.log(`[ingest] skipping junk deal: ${retailer} — "${deal.description.slice(0, 80)}"`)
          continue
        }

        // Skip duplicates within this week (check+add is synchronous — safe with parallel emails)
        const dealKey = makeDealKey(normalizedDeal)
        if (seenDealKeys.has(dealKey)) {
          console.log(`[ingest] skipping duplicate: ${retailer} ${deal.deal_type} ${deal.percent_off}%`)
          continue
        }
        seenDealKeys.add(dealKey)

        // Look up the brand in the stores table. Used for two things:
        //   1. Category routing — union store.categories into deal.categories
        //   2. Auto-activation — flip pending stores to active when their
        //      first deal arrives (with promo email = the validation signal)
        const storeMatch = storesByName.get(normalizeRetailer(retailer))
        const storeCats = storeMatch?.categories ?? []
        const mergedCategories = Array.from(
          new Set([...(deal.categories ?? []), ...storeCats])
        ) as Category[]
        if (storeCats.length > 0) {
          console.log(
            `[ingest] store-routed ${retailer}: LLM=[${(deal.categories ?? []).join(',')}] + store=[${storeCats.join(',')}] → [${mergedCategories.join(',')}]`
          )
        }

        // Auto-activate pending stores. Only flip 'pending' — never
        // touch 'no_email' or 'declined', those are deliberate negative
        // signals. Mutate the in-memory record first so subsequent deals
        // from the same brand this run don't re-fire the UPDATE; the DB
        // write is fire-and-forget since it's idempotent.
        if (storeMatch && !storeMatch.is_active && storeMatch.status === 'pending') {
          storeMatch.is_active = true
          storeMatch.status = 'active'
          supabase
            .from('stores')
            .update({ is_active: true, status: 'active' })
            .eq('id', storeMatch.id)
            .then(({ error: actErr }) => {
              if (actErr) {
                console.error(`[ingest] auto-activate error for ${retailer}:`, JSON.stringify(actErr))
              } else {
                console.log(`[ingest] auto-activated pending store: ${retailer}`)
              }
            })
        }

        const dealRow = {
          retailer,
          description: deal.description,
          percent_off: deal.percent_off,
          deal_type: deal.deal_type,
          promo_code: deal.promo_code,
          expiration_date: deal.expiration_date,
          original_link: deal.link || `https://google.com/search?q=${encodeURIComponent(retailer)}`,
          affiliate_link: null,
          categories: mergedCategories,
          deal_subtype: deal.deal_subtype ?? null,
          last_seen_at: new Date().toISOString(),
          week_of: weekOfStr,
          source_email_id: email.id,
          source_email_link: email.viewInBrowserUrl ?? null,
          is_manual: email.isManual,
        }

        // Lazy-populate retailer_categories: the first time we see a deal
        // from this retailer in this run, ask the LLM what categories the
        // brand sells overall (Walmart → 50+, Boll & Branch → 2). Cached
        // in-memory for the rest of the run; persisted across runs in the
        // retailer_categories table.
        if (!retailerCategoriesCache.has(retailer)) {
          retailerCategoriesCache.set(retailer, true)
          // Skip the LLM call if the retailer is already known
          const { data: existingMapping } = await supabase
            .from('retailer_categories')
            .select('retailer')
            .eq('retailer', retailer)
            .limit(1)
            .maybeSingle()
          if (!existingMapping) {
            const retailerCats = await getRetailerCategories(retailer, allCategories)
            if (retailerCats.length > 0) {
              const rows = retailerCats.map((slug, i) => ({
                retailer,
                category_slug: slug,
                is_primary: i === 0,
              }))
              const { error } = await supabase
                .from('retailer_categories')
                .upsert(rows, { onConflict: 'retailer,category_slug' })
              if (error) {
                console.error('[ingest] retailer_categories upsert error:', JSON.stringify(error))
              } else {
                console.log(`[ingest] retailer_categories: ${retailer} → ${retailerCats.join(', ')}`)
              }
            }
          }
        }

        // Plain insert: the processed_emails table already prevents
        // re-processing the same email, and the in-run seenDealKeys set
        // catches duplicates within a single run. There's no unique
        // constraint on (source_email_id, retailer) on the deals table,
        // so an upsert with that onConflict spec fails with Postgres
        // 42P10 — which silently dropped every deal extracted between
        // 2026-04-30 and 2026-05-07.
        const { error: insertError } = await supabase
          .from('deals')
          .insert(dealRow)
        if (insertError) {
          console.error('Deal insert error:', JSON.stringify(insertError))
          continue
        }
        newDeals++
      }

      // Log to retailer_scan_log
      const retailerName = extracted.length > 0 && extracted[0].retailer
        ? extracted[0].retailer
        : parseSenderName(email.from)

      const { data: existingLog } = await supabase
        .from('retailer_scan_log')
        .select('id, emails_processed, deals_extracted')
        .eq('week_of', weekOfStr)
        .eq('retailer', retailerName)
        .single()

      if (existingLog) {
        await supabase
          .from('retailer_scan_log')
          .update({
            emails_processed: existingLog.emails_processed + 1,
            deals_extracted: existingLog.deals_extracted + extracted.length,
          })
          .eq('id', existingLog.id)
      } else {
        await supabase
          .from('retailer_scan_log')
          .insert({
            week_of: weekOfStr,
            retailer: retailerName,
            sender_email: email.from,
            emails_processed: 1,
            deals_extracted: extracted.length,
          })
      }

      await supabase.from('processed_emails').upsert({ email_id: email.id, week_of: weekOfStr })
      processedEmailIds.push(email.id)
      processedUids.push(email.uid)
    }

    // Concurrency-limited worker pool — N workers run in parallel and pick
    // up the next email as soon as their current one finishes, eliminating
    // the head-of-line blocking of the previous batched approach.
    const tProcessStart = Date.now()
    await runWithConcurrency(newEmails, INGEST_CONCURRENCY, async (email) => {
      try {
        await processEmail(email)
      } catch (err) {
        console.error(`Failed to process email ${email.id}:`, err)
      }
    })
    console.log(
      `[ingest] processed ${newEmails.length} emails in ${Date.now() - tProcessStart}ms ` +
        `(${emailsWithDeals} with deals, ${emailsWithNoDeals} empty, ${newDeals} new deals)`
    )

    // Total deals this week — surfaced in the response for debugging.
    // The editions table is gone; homepage + admin stats now compute
    // live from deals + processed_emails (see /api/stats and
    // /api/editions/latest).
    const { count: totalDeals } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('week_of', weekOfStr)

    // Advance the IMAP cursor. We use the max successfully-processed UID
    // (NOT fetchResult.maxUid, which would include emails that errored
    // mid-run). If processedUids is empty for any reason — every email
    // hit an exception — leave the cursor where it was so next run
    // retries.
    if (processedUids.length > 0) {
      const newLastUid = Math.max(...processedUids)
      const { error: cursorErr } = await supabase
        .from('ingest_state')
        .update({
          last_uid: newLastUid,
          uid_validity: fetchResult.uidValidity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'singleton')
      if (cursorErr) {
        console.error('[ingest] cursor update failed:', JSON.stringify(cursorErr))
      } else {
        console.log(
          `[ingest] cursor advanced: last_uid=${newLastUid}, uid_validity=${fetchResult.uidValidity}`
        )
      }
    }

    return NextResponse.json({
      emails_fetched: emails.length,
      emails_processed: newEmails.length,
      emails_deferred: deferred,
      emails_with_deals: emailsWithDeals,
      emails_with_no_deals: emailsWithNoDeals,
      new_deals: newDeals,
      total_deals_this_week: totalDeals ?? 0,
      cursor: {
        last_uid: processedUids.length > 0 ? Math.max(...processedUids) : cursor.afterUid,
        uid_validity: fetchResult.uidValidity,
      },
    })
  } catch (err) {
    console.error('Ingest error:', err)
    await sendAdminAlert({
      subject: '🚨 Deal Dossier — ingest failed',
      body: `Ingest failed at ${new Date().toISOString()}\n\nError: ${err instanceof Error ? err.message : String(err)}\n\nFix it at: https://dealdossier.io/admin`,
    })
    return NextResponse.json({ error: 'Ingestion failed' }, { status: 500 })
  }
}
