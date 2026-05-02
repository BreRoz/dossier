'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { Reveal } from '@/components/Reveal'

function UnsubscribeForm() {
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email') || ''

  const [email, setEmail] = useState(emailParam)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setDone(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Something went wrong.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <>
        <Reveal>
          <div className="t-eyebrow" style={{ color: 'var(--olive-deep)' }}>
            ✓ Unsubscribed
          </div>
        </Reveal>
        <Reveal delay={100}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 300,
              fontSize: 'clamp(40px, 6vw, 72px)',
              marginTop: 20,
              lineHeight: 1,
              letterSpacing: '-0.025em',
            }}
          >
            You&rsquo;ve been{' '}
            <em style={{ color: 'var(--olive-deep)', fontWeight: 300 }}>
              removed.
            </em>
          </h1>
        </Reveal>
        <Reveal delay={200}>
          <p
            style={{
              marginTop: 28,
              color: 'var(--ink-70)',
              fontSize: 16,
              lineHeight: 1.65,
            }}
          >
            <strong style={{ color: 'var(--ink)' }}>{email}</strong> will no
            longer receive Deal Dossier emails. We&rsquo;re sorry to see you go.
          </p>
        </Reveal>
        <Link href="/" className="btn-ghost" style={{ marginTop: 40 }}>
          ← Back to Deal Dossier
        </Link>
      </>
    )
  }

  return (
    <>
      <Reveal>
        <div className="t-eyebrow">Unsubscribe</div>
      </Reveal>
      <Reveal delay={100}>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 300,
            fontSize: 'clamp(40px, 6vw, 72px)',
            marginTop: 20,
            lineHeight: 1,
            letterSpacing: '-0.025em',
          }}
        >
          Leave{' '}
          <em style={{ color: 'var(--olive-deep)', fontWeight: 300 }}>
            Deal Dossier?
          </em>
        </h1>
      </Reveal>
      <Reveal delay={200}>
        <p
          style={{
            marginTop: 28,
            color: 'var(--ink-70)',
            fontSize: 16,
            lineHeight: 1.65,
          }}
        >
          You can also{' '}
          <Link
            href="/preferences"
            style={{ borderBottom: '1px solid currentColor' }}
          >
            adjust your preferences
          </Link>{' '}
          to receive fewer emails or change your categories instead. Confirm your
          email to unsubscribe permanently.
        </p>
      </Reveal>
      <Reveal delay={300}>
        <form onSubmit={handleSubmit} style={{ marginTop: 48 }}>
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
            className="btn-ghost"
            style={{
              marginTop: 32,
              width: '100%',
              textAlign: 'center',
            }}
          >
            {submitting ? 'Processing…' : 'Confirm Unsubscribe'}
          </button>
        </form>
      </Reveal>
    </>
  )
}

export default function UnsubscribePage() {
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
        <div className="wrap" style={{ maxWidth: 640 }}>
          <Suspense
            fallback={
              <p className="t-meta" style={{ color: 'var(--ink-40)' }}>
                Loading…
              </p>
            }
          >
            <UnsubscribeForm />
          </Suspense>
        </div>
      </section>
      <Footer />
    </>
  )
}
