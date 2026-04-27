import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const revalidate = 3600 // refresh hourly — changes only when a new issue goes out

export async function GET() {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('editions')
      .select('week_of, deals_found, retailers_count, emails_scanned')
      .order('week_of', { ascending: false })
      .limit(1)
      .single()

    if (!data) return NextResponse.json({ edition: null })
    return NextResponse.json({ edition: data })
  } catch {
    return NextResponse.json({ edition: null })
  }
}
