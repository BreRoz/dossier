import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()

    // Delete subscriber record (FK cascades to preferences, sent_emails, etc.)
    await service.from('subscribers').delete().eq('id', user.id)

    // Delete the auth user via admin API
    const { error } = await service.auth.admin.deleteUser(user.id)
    if (error) {
      console.error('Delete user error:', error)
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Account delete error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
