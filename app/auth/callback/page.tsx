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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'var(--paper)',
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          border: '1.5px solid var(--olive-deep)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'adminSpin 0.7s linear infinite',
        }}
        aria-hidden="true"
      />
      <p className="t-meta" style={{ color: 'var(--ink-40)' }}>
        Signing you in…
      </p>
    </div>
  )
}
