import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getCurrentWeekOf } from '@/lib/deals'
import { format } from 'date-fns'

export async function POST(req: NextRequest) {
  // Admin only
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!user || (adminEmail && user.email !== adminEmail)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Allow overriding week_of via body, defaulting to current week
  let weekOfStr: string
  try {
    const body = await req.json().catch(() => ({}))
    weekOfStr = body.week_of ?? format(getCurrentWeekOf('thursday'), 'yyyy-MM-dd')
  } catch {
    weekOfStr = format(getCurrentWeekOf('thursday'), 'yyyy-MM-dd')
  }

  console.log('[reset-week] Resetting week_of:', weekOfStr)

  const db = createServiceClient()

  // Run each reset independently so one failure doesn't block the others
  const results = await Promise.allSettled([
    db.from('processed_emails').delete().eq('week_of', weekOfStr),
    db.from('deals').delete().eq('week_of', weekOfStr),
    db.from('retailer_scan_log').delete().eq('week_of', weekOfStr),
    db.from('editions').update({
      emails_scanned: 0,
      deals_found: 0,
      retailers_count: 0,
    }).eq('week_of', weekOfStr),
  ])

  const labels = ['processed_emails', 'deals', 'retailer_scan_log', 'editions']
  const errors: Record<string, string> = {}

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      errors[labels[i]] = String(result.reason)
      console.error(`[reset-week] ${labels[i]} failed:`, result.reason)
    } else if (result.value?.error) {
      // Ignore "table does not exist" — processed_emails may not be created yet
      const msg = result.value.error.message ?? ''
      if (!msg.includes('does not exist') && !msg.includes('relation')) {
        errors[labels[i]] = msg
        console.error(`[reset-week] ${labels[i]} error:`, result.value.error)
      } else {
        console.log(`[reset-week] ${labels[i]} skipped (table not yet created)`)
      }
    } else {
      console.log(`[reset-week] ${labels[i]} cleared`)
    }
  })

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: 'Some resets failed', details: errors }, { status: 500 })
  }

  return NextResponse.json({ success: true, week_of: weekOfStr })
}
