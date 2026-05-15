import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Public stats endpoint used by /admin and other places that want a
// quick "how is the pipeline doing" snapshot. Counts the last 30 days
// of activity straight from the source tables — no precomputed
// editions row required.

export const revalidate = 300 // 5 minute cache

export async function GET() {
  const supabase = createServiceClient()

  // 30-day cutoff anchored to the start of the calendar week 4 weeks ago
  // so the count rolls smoothly with the weekly bucketing. week_of is a
  // DATE; ISO yyyy-MM-dd compares correctly as a string.
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const cutoff = cutoffDate.toISOString().slice(0, 10)

  // Emails ingested in the window.
  const { count: emailsCaught } = await supabase
    .from('processed_emails')
    .select('*', { count: 'exact', head: true })
    .gte('week_of', cutoff)

  // Distinct deals surfaced in the window.
  const { count: dealsFound } = await supabase
    .from('deals')
    .select('*', { count: 'exact', head: true })
    .gte('week_of', cutoff)

  return NextResponse.json({
    emails_caught: emailsCaught ?? 0,
    deals_found: dealsFound ?? 0,
    window_days: 30,
  })
}
