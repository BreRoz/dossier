'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)

      const accessToken  = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const errorParam   = params.get('error')

      if (errorParam || !accessToken || !refreshToken) {
        router.replace('/login?error=auth_failed')
        return
      }

      const supabase = createClient()
      const { data, error } = await supabase.auth.setSession({
        access_token:  accessToken,
        refresh_token: refreshToken,
      })

      if (error || !data.user) {
        router.replace('/login?error=auth_failed')
        return
      }

      // Check onboarding status
      const { data: sub } = await supabase
        .from('subscribers')
        .select('onboarding_completed')
        .eq('email', data.user.email!)
        .single()

      if (sub && !sub.onboarding_completed) {
        router.replace('/welcome')
      } else {
        const next = new URLSearchParams(window.location.search).get('next')
        router.replace(next ?? '/preferences')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--paper)',
    }}>
      <p style={{
        fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600,
        letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--ink-40)',
      }}>
        Signing you in…
      </p>
    </div>
  )
}
