'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DossierLogo } from '@/components/DossierLogo'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setSubmitting(true)
    setError('')

    try {
      // Ensure subscriber record exists
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      // Generate magic link via Supabase admin + send via Resend
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/auth/callback`,
        }),
      })

      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
      {/* Nav */}
      <nav style={{
        height: 56, display: 'flex', alignItems: 'center', padding: '0 60px',
        borderBottom: 'var(--rule)',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <DossierLogo size={22} wordmarkSize={18} />
        </Link>
      </nav>

      {/* Content */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
      }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          {sent ? (
            <div>
              <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16 }}>
                Check your inbox
              </p>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 300, letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: 20 }}>
                Magic link sent.
              </h1>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--ink-70)', lineHeight: 1.65 }}>
                We sent a sign-in link to <strong style={{ color: 'var(--ink)' }}>{email}</strong>. Click the link to access your account and set preferences.
              </p>
              <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-40)', marginTop: 24 }}>
                Link expires in 24 hours · Check your spam folder
              </p>
            </div>
          ) : (
            <>
              <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16 }}>
                Sign In
              </p>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 300, letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: 12 }}>
                Welcome to Deal Dossier.
              </h1>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--ink-70)', lineHeight: 1.65, marginBottom: 40 }}>
                Enter your email address and we'll send you a magic link to sign in. No password required.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-40)', display: 'block', marginBottom: 8 }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field-input"
                  />
                </div>

                {error && (
                  <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'oklch(50% 0.2 20)', marginBottom: 16 }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{ width: '100%', textAlign: 'center' }}
                >
                  {submitting ? 'Sending...' : 'Send Magic Link'}
                </button>

                <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-40)', marginTop: 16, textAlign: 'center' }}>
                  No password required · Free. No paywall.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
