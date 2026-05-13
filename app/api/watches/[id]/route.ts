// DELETE /api/watches/[id] — remove one of the signed-in subscriber's watches.

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data: subscriber } = await service
    .from('subscribers')
    .select('id')
    .eq('email', user.email)
    .single()

  if (!subscriber) {
    return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
  }

  // Scope the delete to this subscriber so users can't delete each other's
  // watches by guessing UUIDs.
  const { error, count } = await service
    .from('subscriber_watches')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('subscriber_id', subscriber.id)

  if (error) {
    console.error('[watches DELETE] error:', JSON.stringify(error))
    return NextResponse.json({ error: 'Failed to remove watch' }, { status: 500 })
  }

  if (!count) {
    return NextResponse.json({ error: 'Watch not found' }, { status: 404 })
  }

  return NextResponse.json({ removed: true })
}
