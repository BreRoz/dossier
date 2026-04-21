import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 52)

  const { data, error } = await supabase
    .from('editions')
    .select('*')
    .order('week_of', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch editions' }, { status: 500 })
  }

  return NextResponse.json({ editions: data || [] })
}
