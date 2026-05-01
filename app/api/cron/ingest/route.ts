import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchPromotionalEmails } from '@/lib/gmail'
import { extractDealsFromEmail } from '@/lib/openai'
import { getCurrentWeekOf, makeDealKey } from '@/lib/deals'
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

// Process emails in parallel batches so the cron doesn't time out on large inboxes.
const INGEST_BATCH_SIZE = 8

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET) return true // Dev mode
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
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

    // Process one email: call OpenAI, filter deals, write to DB.
    // Returns number of deals inserted.
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

        // Skip loyalty/points promotions — earning points is not a price discount
        if (
          deal.deal_type === 'loyalty' ||
          /earn\s+(double|triple|\d+x|bonus)\s+points|bonus\s+points\s+event|rewards?\s+(credit\s+card|members?\s+earn)/i.test(deal.description)
        ) {
          console.log(`[ingest] skipping loyalty/points promo: ${deal.retailer} — "${deal.description.slice(0, 60)}"`)
          continue
        }

        // Skip vague flash-sale descriptions with no concrete savings info
        if (
          deal.deal_type === 'flash-sale' &&
          !deal.percent_off &&
          !deal.promo_code &&
          !/\d+%|\$\d+\s*(off|savings?)|buy\s+\d+|bogo/i.test(deal.description)
        ) {
          console.log(`[ingest] skipping vague flash-sale: ${deal.retailer} — "${deal.description.slice(0, 60)}"`)
          continue
        }

        // Skip price-listing "deals" with no actual discount
        if (
          !deal.percent_off &&
          !deal.promo_code &&
          deal.deal_type !== 'free-shipping' &&
          deal.deal_type !== 'bogo-free' &&
          deal.deal_type !== 'bogo-half' &&
          deal.deal_type !== 'free-item' &&
          /(?:starting at|from|for|at)\s+\$\d+|enjoy\s+\$\d+\+?\s+on|^[\w\s]+for\s+\$\d+\.\d{2}/i.test(deal.description) &&
          !/\d+%\s*off|\$\d+\s*off|save\s+\$\d+/i.test(deal.description)
        ) {
          console.log(`[ingest] skipping price-listing: ${deal.retailer} — "${deal.description.slice(0, 60)}"`)
          continue
        }

        // Skip duplicates within this week (check+add is synchronous — safe with parallel emails)
        const dealKey = makeDealKey(deal)
        if (seenDealKeys.has(dealKey)) {
          console.log(`[ingest] skipping duplicate: ${deal.retailer} ${deal.deal_type} ${deal.percent_off}%`)
          continue
        }
        seenDealKeys.add(dealKey)

        const dealRow = {
          retailer: deal.retailer,
          description: deal.description,
          percent_off: deal.percent_off,
          deal_type: deal.deal_type,
          promo_code: deal.promo_code,
          expiration_date: deal.expiration_date,
          original_link: deal.link || `https://google.com/search?q=${encodeURIComponent(deal.retailer)}`,
          affiliate_link: null,
          categories: deal.categories as Category[],
          week_of: weekOfStr,
          source_email_id: email.id,
          source_email_link: email.viewInBrowserUrl ?? null,
          is_manual: email.isManual,
        }

        const { error: insertError } = await supabase.from('deals').insert(dealRow)
        if (insertError) {
          if (insertError.code === '23505') {
            await supabase
              .from('deals')
              .update(dealRow)
              .eq('source_email_id', dealRow.source_email_id)
              .eq('retailer', dealRow.retailer)
          } else {
            console.error('Deal insert error:', JSON.stringify(insertError))
            continue
          }
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

    // Process emails in parallel batches — 8 concurrent OpenAI calls at a time.
    // 200 emails / 8 = ~25 batches × ~4s each ≈ 100s total (well within 5-min limit).
    for (let i = 0; i < newEmails.length; i += INGEST_BATCH_SIZE) {
      const batch = newEmails.slice(i, i + INGEST_BATCH_SIZE)
      await Promise.all(batch.map(async (email) => {
        try {
          await processEmail(email)
        } catch (err) {
          console.error(`Failed to process email ${email.id}:`, err)
        }
      }))
    }

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
