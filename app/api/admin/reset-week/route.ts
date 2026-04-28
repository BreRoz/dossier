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

  const db = createServiceClient()

  const [
    { error: e1 },
    { error: e2 },
    { error: e3 },
    { error: e4 },
  ] = await Promise.all([
    db.from('processed_emails').delete().eq('week_of', weekOfStr),
    db.from('deals').delete().eq('week_of', weekOfStr),
    db.from('retailer_scan_log').delete().eq('week_of', weekOfStr),
    db.from('editions').update({
      emails_scanned: 0,
      deals_found: 0,
      retailers_count: 0,
    }).eq('week_of', weekOfStr),
  ])

  const errors = [e1, e2, e3, e4].filter(Boolean)
  if (errors.length > 0) {
    console.error('Reset errors:', errors)
    return NextResponse.json({ error: 'Partial reset failure', details: errors }, { status: 500 })
  }

  return NextResponse.json({ success: true, week_of: weekOfStr })
}
