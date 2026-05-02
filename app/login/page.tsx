'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { Reveal } from '@/components/Reveal'

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
    <>
      <Nav />

      <section
        style={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          padding: 'clamp(80px, 10vw, 140px) 0',
        }}
      >
        <div className="wrap" style={{ maxWidth: 720 }}>
          {!sent ? (
            <>
              <Reveal>
                <div className="t-eyebrow">Sign In</div>
              </Reveal>
              <Reveal delay={100}>
                <h1
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 300,
                    fontSize: 'clamp(48px, 7vw, 96px)',
                    marginTop: 20,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                  }}
                >
                  Welcome back to{' '}
                  <em style={{ color: 'var(--olive-deep)', fontWeight: 300 }}>
                    Deal Dossier.
                  </em>
                </h1>
              </Reveal>
              <Reveal delay={220}>
                <p
                  style={{
                    marginTop: 32,
                    color: 'var(--ink-70)',
                    fontSize: 17,
                    lineHeight: 1.55,
                    maxWidth: '40ch',
                  }}
                >
                  Enter your email and we&rsquo;ll send you a magic link. No
                  passwords, ever.
                </p>
              </Reveal>
              <Reveal delay={340}>
                <form
                  onSubmit={handleSubmit}
                  style={{ marginTop: 56, maxWidth: 520 }}
                >
                  <div className="t-meta" style={{ marginBottom: 12 }}>
                    Email Address
                  </div>
                  <div className="field">
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {error && (
                    <p
                      className="t-meta"
                      style={{ marginTop: 16, color: 'oklch(50% 0.2 20)' }}
                    >
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary"
                    style={{ marginTop: 32 }}
                  >
                    {submitting ? 'Sending…' : (
                      <>
                        Send Magic Link <span className="arr">→</span>
                      </>
                    )}
                  </button>
                  <div
                    className="t-meta"
                    style={{ marginTop: 24, color: 'var(--ink-40)' }}
                  >
                    No password required · Free · No paywall
                  </div>
                </form>
              </Reveal>
            </>
          ) : (
            <>
              <Reveal>
                <div className="t-eyebrow" style={{ color: 'var(--olive-deep)' }}>
                  ✓ Check your inbox
                </div>
              </Reveal>
              <Reveal delay={100}>
                <h1
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 300,
                    fontSize: 'clamp(48px, 7vw, 96px)',
                    marginTop: 20,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                  }}
                >
                  Magic link{' '}
                  <em style={{ color: 'var(--olive-deep)', fontWeight: 300 }}>
                    sent.
                  </em>
                </h1>
              </Reveal>
              <Reveal delay={200}>
                <p
                  style={{
                    marginTop: 32,
                    color: 'var(--ink-70)',
                    fontSize: 17,
                    lineHeight: 1.55,
                    maxWidth: '46ch',
                  }}
                >
                  We sent a sign-in link to{' '}
                  <strong style={{ color: 'var(--ink)' }}>{email}</strong>.
                  Click it to access your account and set preferences.
                </p>
              </Reveal>
              <div
                className="t-meta"
                style={{ marginTop: 32, color: 'var(--ink-40)' }}
              >
                Link expires in 24 hours · Check your spam folder
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </>
  )
}
