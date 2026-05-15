import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Legacy URL preserved so cached homepage clients don't break during
// rollout. Returns a 30-day rolling snapshot now — week_of is the most
// recent week we have data for, the rest are real-time counts.
//
// Once the homepage is fully on the new shape this route can be removed
// in favor of /api/stats.

export const revalidate = 600 // 10 minutes

export async function GET() {
  try {
    const supabase = createServiceClient()
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const cutoff = cutoffDate.toISOString().slice(0, 10)

    const [{ count: dealsFound }, { count: emailsScanned }, { data: retailerRows }] = await Promise.all([
      supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .gte('week_of', cutoff),
      supabase
        .from('processed_emails')
        .select('*', { count: 'exact', head: true })
        .gte('week_of', cutoff),
      supabase
        .from('deals')
        .select('retailer')
        .gte('week_of', cutoff),
    ])

    const retailers = new Set((retailerRows ?? []).map((r) => r.retailer))

    // Match the previous response shape so the homepage's existing
    // useState block doesn't need a new schema. issue_number is dropped
    // — the watchlist model has no issues.
    return NextResponse.json({
      edition: {
        week_of: cutoff,
        deals_found: dealsFound ?? 0,
        retailers_count: retailers.size,
        emails_scanned: emailsScanned ?? 0,
      },
    })
  } catch {
    return NextResponse.json({ edition: null })
  }
}
