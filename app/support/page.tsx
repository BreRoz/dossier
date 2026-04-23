'use client'

import { useState, useEffect } from 'react'
import { Nav } from '@/components/Nav'
import { createClient } from '@/lib/supabase/client'

const ISSUE_TYPES = [
  { value: 'no-emails',      label: "I'm not receiving emails" },
  { value: 'cant-login',     label: "I can't log in / didn't get my magic link" },
  { value: 'delete-account', label: 'I want to delete my account' },
  { value: 'subscription',   label: 'I have a question about my subscription' },
  { value: 'bug',            label: 'Something looks wrong / report a bug' },
  { value: 'other',          label: 'Other' },
]

export default function SupportPage() {
  const [email, setEmail]           = useState('')
  const [issueType, setIssueType]   = useState('')
  const [message, setMessage]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]             = useState(false)
  const [error, setError]           = useState('')

  // Pre-fill email if logged in
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!issueType) { setError('Please select an issue type.'); return }
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, issue_type: issueType, message }),
      })
      if (res.ok) {
        setDone(true)
      } else {
        const d = await res.json()
        setError(d.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <Nav showSubscribe />

      <div className="wrap" style={{ paddingTop: 80, paddingBottom: 120, maxWidth: 600 }}>

        <p className="t-section" style={{ marginBottom: 16 }}>Help</p>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px, 5vw, 64px)',
          fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 0.95, marginBottom: 16,
        }}>
          We're here<br />to help.
        </h1>
        <p style={{
          fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--ink-40)',
          lineHeight: 1.65, marginBottom: 56,
        }}>
          Tell us what's going on and we'll get back to you as quickly as we can.
        </p>

        {done ? (
          <div style={{ padding: '40px 40px', background: 'var(--ink-06)' }}>
            <p style={{
              fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.28em', textTransform: 'uppercase',
              color: 'var(--accent)', marginBottom: 12,
            }}>
              Message received
            </p>
            <h2 style={{
              fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 300,
              letterSpacing: '-0.01em', color: 'var(--ink)', marginBottom: 12,
            }}>
              We'll be in touch.
            </h2>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: 14,
              color: 'var(--ink-40)', lineHeight: 1.65,
            }}>
              We aim to respond within one business day. Keep an eye on <strong style={{ color: 'var(--ink)' }}>{email}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Email */}
            <div>
              <label className="t-meta" style={{ display: 'block', marginBottom: 8 }}>
                Your Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="field-input"
              />
            </div>

            {/* Issue type */}
            <div>
              <label className="t-meta" style={{ display: 'block', marginBottom: 12 }}>
                What can we help with?
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ISSUE_TYPES.map(({ value, label }) => {
                  const active = issueType === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setIssueType(value)}
                      style={{
                        textAlign: 'left', padding: '14px 18px',
                        border: '1.5px solid',
                        borderColor: active ? 'var(--ink)' : 'var(--ink-15)',
                        background: active ? 'var(--ink)' : 'transparent',
                        cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <span style={{
                        fontFamily: 'var(--font-sans)', fontSize: 14,
                        fontWeight: active ? 600 : 400,
                        color: active ? 'var(--paper)' : 'var(--ink)',
                      }}>
                        {label}
                      </span>
                      {active && (
                        <span style={{
                          fontFamily: 'var(--font-condensed)', fontSize: 10,
                          letterSpacing: '0.18em', color: 'var(--accent)',
                        }}>✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="t-meta" style={{ display: 'block', marginBottom: 8 }}>
                Tell us more
              </label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe what's happening..."
                rows={5}
                className="field-input"
                style={{ resize: 'vertical', minHeight: 120 }}
              />
            </div>

            {error && (
              <p style={{
                fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.15em',
                textTransform: 'uppercase', color: 'oklch(50% 0.2 20)',
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ alignSelf: 'flex-start', padding: '12px 36px' }}
            >
              {submitting ? 'Sending...' : 'Send Message'}
            </button>

          </form>
        )}
      </div>
    </div>
  )
}
