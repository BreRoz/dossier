import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ week: string }> }
) {
  const { week } = await params
  const supabase = createServiceClient()

  const [{ data: edition }, { data: deals }] = await Promise.all([
    supabase
      .from('editions')
      .select('*')
      .eq('week_of', week)
      .single(),
    supabase
      .from('deals')
      .select('*')
      .eq('week_of', week)
      .order('created_at', { ascending: true }),
  ])

  if (!edition) {
    return NextResponse.json({ error: 'Edition not found' }, { status: 404 })
  }

  return NextResponse.json({ edition, deals: deals || [] })
}
