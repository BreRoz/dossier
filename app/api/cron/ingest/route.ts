import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchPromotionalEmails } from '@/lib/gmail'
import { extractDealsFromEmail } from '@/lib/openai'
import { getCurrentWeekOf, makeDealKey, isJunkDeal } from '@/lib/deals'
import { fixRetailerCase } from '@/lib/stores'
import { sendAdminAlert } from '@/lib/resend'
import { addDays, format } from 'date-fns'
import type { Category } from '@/types'

export const maxDuration = 300 // 5 minute max

// Extract display name from "Store Name <email@domain.com>" format
function parseSenderName(from: string): string {
  const match = from.match(/^([^<]+)</)
  if (match) return match[1].trim()
  return from.split('@')[0].trim()
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
  const weekOf = getCurrentWeekOf('thursday')
  const weekOfStr = format(weekOf, 'yyyy-MM-dd')

  // Scan from the Sunday before the edition Thursday so we catch weekly-ad
  // emails (e.g. H-E-B) that arrive mid-week before the Thursday anchor
  const since = addDays(weekOf, -4)

  try {
    const emails = await fetchPromotionalEmails(since)
    if (emails.length === 0) {
      return NextResponse.json({ emails: 0, new_deals: 0 })
    }

    // Get already-processed email IDs to avoid reprocessing
    // Check both: emails that produced deals AND emails that produced zero deals
    const [{ data: existingDeals }, { data: existingProcessed }] = await Promise.all([
      supabase
        .from('deals')
        .select('source_email_id')
        .eq('week_of', weekOfStr)
        .not('source_email_id', 'is', null),
      supabase
        .from('processed_emails')
        .select('email_id')
        .eq('week_of', weekOfStr),
    ])

    const processedIds = new Set([
      ...(existingDeals || []).map((d) => d.source_email_id),
      ...(existingProcessed || []).map((d) => d.email_id),
    ])
    const newEmails = emails.filter((e) => !processedIds.has(e.id))

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

    async function processEmail(email: (typeof newEmails)[number]): Promise<void> {
      // Fast-path: skip obviously transactional emails without an OpenAI call
      if (isTransactionalEmail(email.subject)) {
        console.log(`[ingest] skip transactional: "${email.subject}"`)
        await supabase.from('processed_emails').upsert({ email_id: email.id, week_of: weekOfStr })
        processedEmailIds.push(email.id)
        return
      }

      const extracted = await extractDealsFromEmail(email.from, email.subject, email.body)
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

        const dealRow = {
          retailer,
          description: deal.description,
          percent_off: deal.percent_off,
          deal_type: deal.deal_type,
          promo_code: deal.promo_code,
          expiration_date: deal.expiration_date,
          original_link: deal.link || `https://google.com/search?q=${encodeURIComponent(retailer)}`,
          affiliate_link: null,
          categories: deal.categories as Category[],
          week_of: weekOfStr,
          source_email_id: email.id,
          source_email_link: email.viewInBrowserUrl ?? null,
          is_manual: email.isManual,
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
    }

    // Concurrency-limited worker pool — N workers run in parallel and pick
    // up the next email as soon as their current one finishes, eliminating
    // the head-of-line blocking of the previous batched approach.
    await runWithConcurrency(newEmails, INGEST_CONCURRENCY, async (email) => {
      try {
        await processEmail(email)
      } catch (err) {
        console.error(`Failed to process email ${email.id}:`, err)
      }
    })

    // Upsert edition stats — always use actual table counts as source of truth
    const [
      { data: allDealsForStats },
      { count: totalProcessed },
    ] = await Promise.all([
      supabase.from('deals').select('retailer').eq('week_of', weekOfStr),
      supabase.from('processed_emails').select('*', { count: 'exact', head: true }).eq('week_of', weekOfStr),
    ])

    const retailers = new Set((allDealsForStats || []).map((d) => d.retailer))
    const totalDeals = allDealsForStats?.length || 0
    const emailsScanned = totalProcessed ?? 0

    const { data: existingEdition } = await supabase
      .from('editions')
      .select('id, issue_number')
      .eq('week_of', weekOfStr)
      .single()

    if (existingEdition) {
      await supabase
        .from('editions')
        .update({
          emails_scanned: emailsScanned,
          deals_found: totalDeals,
          retailers_count: retailers.size,
        })
        .eq('id', existingEdition.id)
    } else {
      const { data: lastEdition } = await supabase
        .from('editions')
        .select('issue_number')
        .order('week_of', { ascending: false })
        .limit(1)
        .single()

      const nextIssue = lastEdition?.issue_number ? lastEdition.issue_number + 1 : 1

      await supabase.from('editions').insert({
        week_of: weekOfStr,
        issue_number: nextIssue,
        emails_scanned: emailsScanned,
        deals_found: totalDeals,
        retailers_count: retailers.size,
      })
    }

    return NextResponse.json({
      emails_processed: newEmails.length,
      emails_with_deals: emailsWithDeals,
      emails_with_no_deals: emailsWithNoDeals,
      new_deals: newDeals,
      total_deals_this_week: totalDeals,
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
