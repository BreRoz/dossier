import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if this user has completed onboarding
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data: sub } = await supabase
          .from('subscribers')
          .select('onboarding_completed')
          .eq('email', user.email)
          .single()

        if (sub && !sub.onboarding_completed) {
          return NextResponse.redirect(`${origin}/welcome`)
        }
      }
      return NextResponse.redirect(`${origin}${next ?? '/preferences'}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
