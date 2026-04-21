import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'

const Schema = z.object({ email: z.string().email() })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('subscribers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('email', parsed.data.email)

    if (error) {
      return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
