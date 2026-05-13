'use client'

import { useState, useEffect, useMemo } from 'react'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { Reveal } from '@/components/Reveal'

export const dynamic = 'force-dynamic'

interface Category {
  slug: string
  label: string
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  // Watchlist picker state
  const [categories, setCategories] = useState<Category[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => {})
  }, [])

  const togglePick = (slug: string) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q
      ? categories.filter((c) => c.label.toLowerCase().includes(q))
      : categories
  }, [categories, search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setSubmitting(true)
    setError('')

    try {
      // Create / update subscriber, seed watchlist with any picks
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          watches: picked.size > 0 ? Array.from(picked) : undefined,
        }),
      })

      // Send the magic-link email
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
          padding: 'clamp(56px, 8vw, 96px) 0 clamp(64px, 8vw, 96px)',
        }}
      >
        <div className="wrap" style={{ maxWidth: 720 }}>
          {!sent ? (
            <>
              <Reveal>
                <div className="t-eyebrow">Sign In · Sign Up</div>
              </Reveal>
              <Reveal delay={100}>
                <h1
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 300,
                    fontSize: 'clamp(40px, 6vw, 80px)',
                    marginTop: 20,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                  }}
                >
                  What are you{' '}
                  <em style={{ color: 'var(--olive-deep)', fontWeight: 300 }}>
                    shopping for?
                  </em>
                </h1>
              </Reveal>
              <Reveal delay={220}>
                <p
                  style={{
                    marginTop: 24,
                    color: 'var(--ink-70)',
                    fontSize: 17,
                    lineHeight: 1.55,
                    maxWidth: '50ch',
                  }}
                >
                  Tell us what you&rsquo;re hunting for and we&rsquo;ll send deals
                  the moment they hit. Already a subscriber? Just enter your email
                  to sign in — your watchlist is preserved.
                </p>
              </Reveal>

              <Reveal delay={340}>
                <form onSubmit={handleSubmit} style={{ marginTop: 56 }}>
                  {/* Email */}
                  <div className="t-meta" style={{ marginBottom: 12 }}>
                    Email Address
                  </div>
                  <div className="field" style={{ maxWidth: 520 }}>
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {/* Watchlist picker */}
                  <div style={{ marginTop: 48 }}>
                    <div
                      className="t-meta"
                      style={{
                        marginBottom: 8,
                        display: 'flex',
                        gap: 12,
                        flexWrap: 'wrap',
                        alignItems: 'baseline',
                      }}
                    >
                      <span>Pick what you&rsquo;re shopping for</span>
                      <span style={{ color: 'var(--ink-40)' }}>
                        {picked.size > 0
                          ? `${picked.size} picked`
                          : 'optional — skip if just signing in'}
                      </span>
                    </div>

                    <div className="field" style={{ marginBottom: 12, maxWidth: 520 }}>
                      <input
                        type="search"
                        placeholder="Search categories…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: 6,
                        maxHeight: 360,
                        overflowY: 'auto',
                        padding: 4,
                        border: '1px solid var(--ink-15)',
                        background: 'var(--paper)',
                      }}
                    >
                      {filteredCategories.length === 0 ? (
                        <div
                          style={{
                            gridColumn: '1/-1',
                            padding: 24,
                            textAlign: 'center',
                            color: 'var(--ink-55)',
                            fontSize: 13.5,
                          }}
                        >
                          {categories.length === 0
                            ? 'Loading…'
                            : 'No match. Try a different search.'}
                        </div>
                      ) : (
                        filteredCategories.map((c) => {
                          const on = picked.has(c.slug)
                          return (
                            <button
                              key={c.slug}
                              type="button"
                              onClick={() => togglePick(c.slug)}
                              style={{
                                textAlign: 'left',
                                padding: '10px 12px',
                                border: `1.5px solid ${on ? 'var(--ink)' : 'var(--ink-15)'}`,
                                background: on
                                  ? 'var(--ink)'
                                  : 'transparent',
                                color: on
                                  ? 'var(--paper)'
                                  : 'var(--ink)',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                fontSize: 13.5,
                                transition: 'all .12s',
                              }}
                            >
                              {on ? '✓ ' : '+ '}
                              {c.label}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {error && (
                    <p
                      className="t-meta"
                      style={{ marginTop: 24, color: 'oklch(50% 0.2 20)' }}
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary"
                    style={{ marginTop: 40 }}
                  >
                    {submitting ? (
                      'Sending…'
                    ) : (
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
                  {picked.size > 0 ? (
                    <>
                      {' '}
                      We&rsquo;ve also queued up your {picked.size}{' '}
                      {picked.size === 1 ? 'pick' : 'picks'} — they&rsquo;ll be
                      waiting on your watchlist when you sign in.
                    </>
                  ) : (
                    <>
                      {' '}
                      Click it to access your watchlist.
                    </>
                  )}
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
