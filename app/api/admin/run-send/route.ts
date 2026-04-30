import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  // Admin only
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!user || (adminEmail && user.email !== adminEmail)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dealdossier.io'
  const secret = process.env.CRON_SECRET

  const res = await fetch(`${appUrl}/api/cron/send`, {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
