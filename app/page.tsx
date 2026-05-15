'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { Reveal, MaskLines } from '@/components/Reveal'
import { FlapNumber } from '@/components/FlapNumber'

// ── Free tier features (label: bold, body: regular) ─────────────────────────
const FREE_FEATURES: [string, string][] = [
  ['Watchlist of up to 3', 'Tell us what you’re shopping for. We’ll email deals as they hit your retailers.'],
  ['Every major retailer', 'We’re subscribed to over 1,000 brand newsletters. The hunting is all on us.'],
  ['On-demand refresh', 'Hit “send me deals now” any time you’re about to shop. Updates within seconds.'],
  ['No credit card', 'Free forever. Upgrade when you want to track more than 3 things at once.'],
]

// ── Paid tier features ──────────────────────────────────────────────────────
const PAID_FEATURES: [string, string][] = [
  ['Unlimited watches', 'Track every shopping need at once — towels, mattresses, perfume, mens jeans, all of it.'],
  ['Per-watch modifiers', 'Narrow each watch by sub-type (jeans vs sweaters), gender, price tier, min discount.'],
  ['Ad-free emails', 'Your watchlist emails arrive clean — no banner ads, no AdSense.'],
  ['Priority alerts', 'New deals from your watched retailers reach you faster than the free queue.'],
  ['Suggest brands', 'Tell us about a retailer we’re missing — we’ll evaluate and add it to the rotation.'],
]

// ── FAQ ──────────────────────────────────────────────────────────────────
const FAQ_ITEMS: { q: string; a: ReactNode }[] = [
  {
    q: 'How does the watchlist work?',
    a: (
      <>
        <p>
          You tell us what you&rsquo;re shopping for — bath &amp; towels, a new mattress, mens
          jeans, perfume, whatever. We do the rest.
        </p>
        <p>
          Our AI is subscribed to over 1,000 brand newsletters. Every day it scans the inbox,
          extracts real discounts, tags each deal by category, and stores them. The moment you ask
          for an update — by hitting &ldquo;send me deals now&rdquo; or signing up for a new
          category — we email everything we&rsquo;re currently tracking that matches your
          watchlist. Within seconds, not Thursdays.
        </p>
        <p>
          When you find what you needed and buy it, remove that category. Move on to the next
          thing you&rsquo;re hunting for. Repeat.
        </p>
      </>
    ),
  },
  {
    q: 'Is the free tier really free?',
    a: (
      <>
        <p>Yes, absolutely.</p>
        <p>
          We don&rsquo;t ask for a credit card. The free tier covers up to 3 active watches plus
          the on-demand refresh — enough to track most short-term shopping projects (towels,
          luggage, a coat for fall) at no cost. The paid tier ($4.99/month, $45/year) lifts the
          cap so you can track unlimited categories simultaneously — useful if you&rsquo;re
          juggling a kitchen remodel, a new baby, and a wardrobe refresh all at once.
        </p>
      </>
    ),
  },
  {
    q: 'How are deals selected?',
    a: (
      <>
        <p>
          AI does the window shopping for you. We&rsquo;re subscribed to over 1,000 brand
          newsletters. Every day, our system scans the inbox, filters out fluff (&ldquo;check out
          our new blog post&rdquo;) and personalized one-time codes, and pulls out only the real
          discounts.
        </p>
        <p>
          We never show welcome offers, birthday codes, or anything that only works once per
          person — those are useless to most readers. We also tag each deal with all the
          categories it applies to, so a Walmart grocery email reaches you if you&rsquo;re
          watching groceries, but not if you&rsquo;re watching mattresses.
        </p>
      </>
    ),
  },
  {
    q: 'How are deals ranked in my email?',
    a: (
      <>
        <p>
          Two factors work together. The biggest driver is savings — a 60% off deal ranks above a
          20% off deal, every time.
        </p>
        <p>
          Second, we factor in store tier. A rare sale at a higher-end retailer gets a meaningful
          boost over the same discount at a store that&rsquo;s always running promotions. A 30%
          off at a store where 30% off is basically the regular price isn&rsquo;t actually a
          deal.
        </p>
        <p>
          Free shipping deals are always shown last — nice, but not why you&rsquo;re here.
        </p>
      </>
    ),
  },
  {
    q: 'How does paid billing work?',
    a: (
      <>
        <p>
          Personal Shopper is $4.99/month or $45/year (save 25% annual). Billing is handled by
          Stripe — your card details never touch our servers.
        </p>
        <p>
          Cancel any time from your account settings. You keep access through the end of the
          period you&rsquo;ve already paid for, then drop back to the free tier — your
          watchlist and history are preserved.
        </p>
      </>
    ),
  },
]

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [edition, setEdition] = useState<{
    week_of: string
    deals_found: number
    retailers_count: number
    emails_scanned: number
  } | null>(null)
  const [openFaq, setOpenFaq] = useState<number>(0)

  // Fetch latest edition stats for the live ticker
  useEffect(() => {
    fetch('/api/editions/latest')
      .then((r) => r.json())
      .then((d) => {
        if (d.edition) setEdition(d.edition)
      })
      .catch(() => {})
  }, [])

  // Cursor parallax — translates rings via CSS custom properties on the hero
  const heroRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = heroRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      el.style.setProperty('--mx', x.toFixed(3))
      el.style.setProperty('--my', y.toFixed(3))
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setSubmitting(true)
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/auth/callback`,
        }),
      })
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <>
      <Nav />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        style={{
          position: 'relative',
          padding: 'clamp(60px, 9vw, 120px) 0 clamp(80px, 10vw, 140px)',
          overflow: 'hidden',
        }}
      >
        {/* Decorative rings — cursor parallax via --mx / --my */}
        <div
          className="ring"
          style={{
            width: 720,
            height: 720,
            top: '-180px',
            right: '-200px',
            opacity: 0.6,
            transform: 'translate(calc(var(--mx, 0) * 14px), calc(var(--my, 0) * 14px))',
            transition: 'transform .8s var(--easing-out)',
          }}
        />
        <div
          className="ring"
          style={{
            width: 420,
            height: 420,
            top: '120px',
            right: '-60px',
            opacity: 0.5,
            transform: 'translate(calc(var(--mx, 0) * -22px), calc(var(--my, 0) * -22px))',
            transition: 'transform .8s var(--easing-out)',
          }}
        />

        <div className="wrap" style={{ position: 'relative', zIndex: 2 }}>
          {/* Issue meta + live stats ticker */}
          <div className="ticker" style={{ marginBottom: 64, border: 'none', padding: 0 }}>
            <span className="dot" />
            <span className="t-meta">
              Last 30 days · {today}
            </span>
            <div className="ticker-stats" style={{ marginLeft: 'auto' }}>
              <div className="item">
                <span className="t-mono">
                  <FlapNumber value={String(edition?.deals_found ?? 0)} />
                </span>
                <span className="t-meta">Deals</span>
              </div>
              <div className="item">
                <span className="t-mono">
                  <FlapNumber value={String(edition?.retailers_count ?? 0)} />
                </span>
                <span className="t-meta">Retailers</span>
              </div>
              <div className="item">
                <span className="t-mono">
                  <FlapNumber value={String(edition?.emails_scanned ?? 0).padStart(4, '0')} />
                </span>
                <span className="t-meta">Scanned</span>
              </div>
            </div>
          </div>

          {/* Headline — three-line mask reveal with olive italic mid-line */}
          <h1
            className="t-display"
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 300,
              letterSpacing: '-0.035em',
              lineHeight: 0.92,
              fontSize: 'clamp(56px, 9.5vw, 156px)',
            }}
          >
            <MaskLines lines={['Tell us']} stagger={0} />
            <br />
            <MaskLines
              lines={[
                <span key="want" className="it" style={{ color: 'var(--olive-deep)' }}>
                  what you want.
                </span>,
              ]}
              delay={120}
            />
            <br />
            <MaskLines lines={[`We'll find the deal.`]} delay={260} />
          </h1>

          {/* Subline + form, two-column grid */}
          <div
            className="hero-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.1fr 1fr',
              gap: 64,
              marginTop: 80,
              alignItems: 'end',
            }}
          >
            <Reveal delay={500}>
              <p style={{ fontSize: 19, lineHeight: 1.5, maxWidth: '36ch', color: 'var(--ink-70)' }}>
                Build a watchlist of what you&rsquo;re shopping for. We sit on every
                retailer&rsquo;s promo inbox so you don&rsquo;t have to.{' '}
                <em style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)' }}>
                  Never pay full price for what you&rsquo;re looking for.
                </em>
              </p>
            </Reveal>

            <Reveal delay={650}>
              {!submitted ? (
                <form onSubmit={handleSubmit}>
                  <div className="t-meta" style={{ marginBottom: 14 }}>
                    Subscribe — Free, No Paywall
                  </div>
                  <div className="field">
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        padding: '0 4px',
                        fontSize: 11.5,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        fontWeight: 500,
                      }}
                    >
                      {submitting ? 'Sending…' : (
                        <>
                          Subscribe <span style={{ marginLeft: 8 }}>→</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="t-meta" style={{ marginTop: 14, color: 'var(--ink-40)' }}>
                    Free · Unsubscribe anytime · Magic link sign-in
                  </div>
                </form>
              ) : (
                <div>
                  <div className="t-meta" style={{ marginBottom: 12, color: 'var(--olive-deep)' }}>
                    ✓ Magic link sent
                  </div>
                  <p
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 28,
                      lineHeight: 1.2,
                      fontStyle: 'italic',
                    }}
                  >
                    Check your inbox.
                  </p>
                  <div className="t-meta" style={{ marginTop: 12, color: 'var(--ink-40)' }}>
                    We sent a link to{' '}
                    <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--ink)' }}>
                      {email}
                    </span>
                  </div>
                </div>
              )}
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────────────────── */}
      <div className="marquee">
        <div className="marquee-track">
          <span>Discernment</span>
          <span>Not noise</span>
          <span>Worth it</span>
          <span>Editorial</span>
          <span>Once a week</span>
          <span>Discernment</span>
          <span>Not noise</span>
          <span>Worth it</span>
          <span>Editorial</span>
          <span>Once a week</span>
        </div>
      </div>

      {/* ── MANIFESTO ────────────────────────────────────────────────────── */}
      <section className="section">
        <div className="wrap">
          <div
            className="manifesto-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 64 }}
          >
            <div>
              <Reveal>
                <div className="t-eyebrow">The Brief</div>
              </Reveal>
            </div>
            <div>
              <Reveal>
                <p
                  className="t-display"
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 300,
                    fontSize: 'clamp(28px, 3.4vw, 48px)',
                    lineHeight: 1.15,
                    letterSpacing: '-0.02em',
                    maxWidth: '22ch',
                  }}
                >
                  We skip what isn’t worth it. We ignore the fake urgency. We don’t chase every flash sale
                  or pretend to be comprehensive.{' '}
                  <em style={{ color: 'var(--olive-deep)' }}>That’s not the job.</em>
                </p>
              </Reveal>
              <Reveal delay={200}>
                <p
                  style={{
                    marginTop: 32,
                    maxWidth: '50ch',
                    color: 'var(--ink-70)',
                    fontSize: 16,
                    lineHeight: 1.65,
                  }}
                >
                  The job is discernment. A 10% discount with a $200 minimum is not a win. “Store cash”
                  is not savings. And 47 emails a week is not a strategy, it’s a system designed to wear
                  you down until you click something, anything, just to feel like you didn’t miss out.
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="section section-tight" style={{ borderTop: '1px solid var(--ink-15)' }}>
        <div className="wrap">
          <Reveal>
            <div className="t-eyebrow" style={{ marginBottom: 48 }}>
              The System
            </div>
          </Reveal>
          <div className="grid-3">
            {[
              {
                n: '01',
                t: 'Scan',
                b: 'We subscribe to 500+ brand newsletters. Our system reads thousands of promotional emails a week so you never have to.',
              },
              {
                n: '02',
                t: 'Edit',
                b: 'AI extracts every real discount. We strip the fluff, ignore the fake urgency, and rank what remains by actual value.',
              },
              {
                n: '03',
                t: 'Deliver',
                b: 'You tell us what you’re shopping for. We email matching deals — on demand, the moment you ask.',
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <div style={{ borderTop: '1px solid var(--ink)', paddingTop: 24 }}>
                  <div className="t-meta" style={{ color: 'var(--olive-deep)' }}>
                    {s.n}
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 44,
                      marginTop: 16,
                      lineHeight: 1,
                      fontStyle: 'italic',
                      fontWeight: 300,
                    }}
                  >
                    {s.t}
                  </h3>
                  <p style={{ marginTop: 20, color: 'var(--ink-70)', fontSize: 14, lineHeight: 1.65 }}>
                    {s.b}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section className="section" style={{ background: 'var(--bone-2)' }}>
        <div className="wrap">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 64,
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            <Reveal>
              <div className="t-eyebrow">Pricing</div>
            </Reveal>
            <Reveal delay={120}>
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 300,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  fontSize: 'clamp(40px, 5vw, 72px)',
                  maxWidth: '14ch',
                  textAlign: 'right',
                }}
              >
                Two ways to <em style={{ color: 'var(--olive-deep)' }}>read</em>.
              </h2>
            </Reveal>
          </div>

          <div className="grid-2" style={{ gap: 24 }}>
            {/* Free tier */}
            <Reveal>
              <div
                className="card"
                style={{
                  background: 'var(--paper)',
                  minHeight: 560,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div className="t-eyebrow">Inbox Cleaner</div>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 64,
                    marginTop: 16,
                    lineHeight: 1,
                    fontWeight: 300,
                    letterSpacing: '-0.02em',
                  }}
                >
                  $0
                  <span
                    style={{
                      fontSize: 18,
                      color: 'var(--ink-55)',
                      fontStyle: 'italic',
                      marginLeft: 8,
                    }}
                  >
                    /forever
                  </span>
                </h3>
                <div className="hr" />
                <ul
                  style={{
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                    flex: 1,
                    padding: 0,
                  }}
                >
                  {FREE_FEATURES.map(([t, b]) => (
                    <li key={t} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 12 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontStyle: 'italic',
                          color: 'var(--olive-deep)',
                        }}
                      >
                        —
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{t}</div>
                        <div style={{ color: 'var(--ink-70)', fontSize: 14, marginTop: 2 }}>{b}</div>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className="btn-ghost"
                  style={{ marginTop: 32, alignSelf: 'flex-start' }}
                >
                  Subscribe Free <span className="arr">→</span>
                </Link>
              </div>
            </Reveal>

            {/* Paid tier */}
            <Reveal delay={120}>
              <div
                className="card card-dark"
                style={{
                  minHeight: 560,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                <div className="t-eyebrow" style={{ color: 'var(--olive)' }}>
                  Personal Shopper
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 64,
                    marginTop: 16,
                    lineHeight: 1,
                    fontWeight: 300,
                    letterSpacing: '-0.02em',
                    color: 'var(--paper)',
                  }}
                >
                  $4.99
                  <span
                    style={{
                      fontSize: 18,
                      color: 'var(--paper-on-ink-55)',
                      fontStyle: 'italic',
                      marginLeft: 8,
                    }}
                  >
                    /month
                  </span>
                </h3>
                <div className="t-meta" style={{ marginTop: 6, color: 'var(--paper-on-ink-55)' }}>
                  or $45/year — save 25%
                </div>
                <div className="hr" style={{ background: 'var(--paper-on-ink-15)' }} />
                <ul
                  style={{
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                    flex: 1,
                    padding: 0,
                  }}
                >
                  {PAID_FEATURES.map(([t, b]) => (
                    <li key={t} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 12 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontStyle: 'italic',
                          color: 'var(--olive)',
                        }}
                      >
                        —
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--paper)' }}>{t}</div>
                        <div style={{ color: 'var(--paper-on-ink-55)', fontSize: 14, marginTop: 2 }}>
                          {b}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  style={{
                    marginTop: 32,
                    alignSelf: 'flex-start',
                    fontFamily: 'var(--font-condensed)',
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                    border: '1.5px solid var(--paper)',
                    padding: '14px 32px',
                    textDecoration: 'none',
                    display: 'inline-block',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  Subscribe <span className="arr">→</span>
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="section">
        <div className="wrap">
          <div
            className="manifesto-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 64, alignItems: 'flex-start' }}
          >
            <div>
              <Reveal>
                <div className="t-eyebrow">Questions</div>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 300,
                    fontSize: 'clamp(40px, 5vw, 72px)',
                    marginTop: 16,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Worth
                  <br />
                  <em style={{ color: 'var(--olive-deep)' }}>asking.</em>
                </h2>
              </Reveal>
            </div>
            <div>
              <div style={{ borderTop: '1px solid var(--ink)' }}>
                {FAQ_ITEMS.map((item, i) => (
                  <Reveal key={item.q} delay={i * 60}>
                    <div style={{ borderBottom: '1px solid var(--ink-15)' }}>
                      <button
                        type="button"
                        onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                        style={{
                          width: '100%',
                          padding: '24px 0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-serif)',
                          fontSize: 24,
                          fontStyle: openFaq === i ? 'italic' : 'normal',
                          fontWeight: 350,
                          letterSpacing: '-0.01em',
                          color: openFaq === i ? 'var(--olive-deep)' : 'var(--ink)',
                          transition: 'color .35s var(--easing)',
                          textAlign: 'left',
                        }}
                      >
                        <span>{item.q}</span>
                        <span
                          style={{
                            fontSize: 18,
                            transition: 'transform .4s var(--easing)',
                            transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)',
                            fontFamily: 'var(--font-sans)',
                            fontWeight: 300,
                          }}
                        >
                          +
                        </span>
                      </button>
                      <div
                        style={{
                          maxHeight: openFaq === i ? 600 : 0,
                          overflow: 'hidden',
                          transition: 'max-height .55s var(--easing)',
                        }}
                      >
                        <div
                          style={{
                            paddingBottom: 24,
                            color: 'var(--ink-70)',
                            fontSize: 15,
                            lineHeight: 1.65,
                            maxWidth: '60ch',
                          }}
                        >
                          {item.a}
                        </div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
