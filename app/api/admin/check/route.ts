import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Returns whether the current authenticated user is the configured admin.
// ADMIN_EMAIL is a server-only env var, so the comparison stays server-side.
// Used by Nav to conditionally render the "Admin" link.
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const adminEmail = process.env.ADMIN_EMAIL
    const isAdmin = !!(user && adminEmail && user.email === adminEmail)

    return NextResponse.json({ isAdmin })
  } catch {
    return NextResponse.json({ isAdmin: false })
  }
}
