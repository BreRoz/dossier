'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Nav } from '@/components/Nav'

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

  return (
    <div style={{ width: '100%', maxWidth: 480 }}>
      {done ? (
        <div>
          <p className="t-section" style={{ marginBottom: 16 }}>Unsubscribed</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 300, letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: 20 }}>
            You've been removed.
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--ink-70)', lineHeight: 1.65, marginBottom: 32 }}>
            <strong style={{ color: 'var(--ink)' }}>{email}</strong> will no longer receive Dossier emails. We're sorry to see you go.
          </p>
          <Link href="/" style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-40)', textDecoration: 'none' }}>
            ← Back to DOSSIER
          </Link>
        </div>
      ) : (
        <>
          <p className="t-section" style={{ marginBottom: 16 }}>Unsubscribe</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 300, letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: 20 }}>
            Leave DOSSIER?
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--ink-70)', lineHeight: 1.65, marginBottom: 8 }}>
            You can also <Link href="/preferences" style={{ color: 'var(--ink)' }}>adjust your preferences</Link> to receive fewer emails or change your categories instead.
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--ink-70)', lineHeight: 1.65, marginBottom: 40 }}>
            Confirm your email to unsubscribe permanently.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label className="t-meta" style={{ display: 'block', marginBottom: 8 }}>Email Address</label>
              <input
                type="email"
                required
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
              style={{
                fontFamily: 'var(--font-condensed)', fontSize: 12, fontWeight: 600,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                background: 'transparent', color: 'var(--ink)',
                border: '1.5px solid var(--ink-15)', padding: '14px 32px',
                cursor: submitting ? 'default' : 'pointer', width: '100%',
              }}
            >
              {submitting ? 'Processing...' : 'Confirm Unsubscribe'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
      <Nav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Suspense fallback={<p className="t-meta">Loading...</p>}>
          <UnsubscribeForm />
        </Suspense>
      </div>
    </div>
  )
}
