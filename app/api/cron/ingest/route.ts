import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchPromotionalEmails } from '@/lib/gmail'
import { extractDealsFromEmail } from '@/lib/openai'
import { getCurrentWeekOf } from '@/lib/deals'
import { subHours, addDays, format } from 'date-fns'
import type { Category } from '@/types'

export const maxDuration = 300 // 5 minute max

// Extract display name from "Store Name <email@domain.com>" format
function parseSenderName(from: string): string {
  const match = from.match(/^([^<]+)</)
  if (match) return match[1].trim()
  return from.split('@')[0].trim()
}

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

  // Get emails from the last 7 days for initial backfill
  const since = subHours(new Date(), 168)

  try {
    const emails = await fetchPromotionalEmails(since)
    if (emails.length === 0) {
      return NextResponse.json({ emails: 0, new_deals: 0 })
    }

    // Get already-processed email IDs to avoid reprocessing
    const { data: existing } = await supabase
      .from('deals')
      .select('source_email_id')
      .eq('week_of', weekOfStr)
      .not('source_email_id', 'is', null)

    const processedIds = new Set((existing || []).map((d) => d.source_email_id))
    const newEmails = emails.filter((e) => !processedIds.has(e.id))

    let newDeals = 0
    const processedEmailIds: string[] = []

    for (const email of newEmails) {
      try {
        // Small delay between OpenAI calls to avoid rate limiting
        await new Promise((r) => setTimeout(r, 500))
        const extracted = await extractDealsFromEmail(email.from, email.subject, email.body)

        for (const deal of extracted) {
          // Skip deals with no real value
          if (!deal.description || !deal.retailer) continue

          // Affiliate link lookup (future: match retailer to affiliate)
          const affiliateLink = null

          const dealRow = {
            retailer: deal.retailer,
            description: deal.description,
            percent_off: deal.percent_off,
            deal_type: deal.deal_type,
            promo_code: deal.promo_code,
            expiration_date: deal.expiration_date,
            original_link: deal.link || `https://google.com/search?q=${encodeURIComponent(deal.retailer)}`,
            affiliate_link: affiliateLink,
            categories: deal.categories as Category[],
            week_of: weekOfStr,
            source_email_id: email.id,
            source_email_link: email.viewInBrowserUrl ?? null,
            is_manual: email.isManual,
          }

          await supabase.from('deals').upsert(dealRow, {
            onConflict: 'source_email_id,retailer',
            ignoreDuplicates: false,
          })

          newDeals++
        }

        // Log this sender to the retailer scan log
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

        processedEmailIds.push(email.id)
      } catch (err) {
        console.error(`Failed to process email ${email.id}:`, err)
      }
    }

    // Upsert edition stats
    const { data: allDeals } = await supabase
      .from('deals')
      .select('retailer')
      .eq('week_of', weekOfStr)

    const retailers = new Set((allDeals || []).map((d) => d.retailer))
    const totalDeals = allDeals?.length || 0

    const { data: existingEdition } = await supabase
      .from('editions')
      .select('id, issue_number')
      .eq('week_of', weekOfStr)
      .single()

    if (existingEdition) {
      await supabase
        .from('editions')
        .update({
          emails_scanned: (existingEdition as any).emails_scanned + newEmails.length,
          deals_found: totalDeals,
          retailers_count: retailers.size,
        })
        .eq('id', existingEdition.id)
    } else {
      // Get next issue number
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
        emails_scanned: newEmails.length,
        deals_found: totalDeals,
        retailers_count: retailers.size,
      })
    }

    return NextResponse.json({
      emails_processed: newEmails.length,
      new_deals: newDeals,
      total_deals_this_week: totalDeals,
    })
  } catch (err) {
    console.error('Ingest error:', err)
    return NextResponse.json({ error: 'Ingestion failed' }, { status: 500 })
  }
}
