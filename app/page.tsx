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
  ['Inbox Declutter', 'Unsubscribe from hundreds of brands immediately. We do the listening for you.'],
  ['Essential Coverage', 'Weekly digests covering the Big Three — Fashion, Grocery, Restaurants.'],
  ['High-Value Only', 'A strict 40% minimum discount filter. Only deals worth your time.'],
  ['Thursday Boost', 'A curated list delivered right before the weekend shopping rush.'],
]

// ── Paid tier features ──────────────────────────────────────────────────────
const PAID_FEATURES: [string, string][] = [
  ['Total Category Access', 'Unlock all 13 categories — Tech, Home, Travel, Beauty, and more.'],
  ['Bespoke Filters', 'Set your own bar — 20%, 30%, 50%+ thresholds for any retailer.'],
  ['Curated For Your Life', 'Age-based filters and demographic discovery — find brands that fit.'],
  ['Granular Control', 'Toggle specific stores. Ignore brands you don’t like, prioritize favorites.'],
  ['Stackable Alerts', 'Be first to know when a sale, loyalty bonus, and BOGO all hit at once.'],
  ['On-Demand Scheduling', 'Tuesday for grocery planning. Saturday for browsing. Your call.'],
]

// ── FAQ — preserves the substantive multi-paragraph answers from prior copy ─
const FAQ_ITEMS: { q: string; a: ReactNode }[] = [
  {
    q: 'Is the free tier really free?',
    a: (
      <>
        <p>Yes, absolutely.</p>
        <p>
          We don’t ask for a credit card to get started. The free tier is designed to give you a decluttered
          inbox experience right away. You get our core Big Three categories (Fashion, Grocery, Restaurants)
          and our curated Thursday digest at no cost. We only charge for the Premium Tier if you want to
          unlock advanced features like custom send days, deep-dive category filters, and store-specific
          controls.
        </p>
      </>
    ),
  },
  {
    q: 'Can I change categories later?',
    a: (
      <>
        <p>Yes, you have full control.</p>
        <p>
          On the Free Tier you’re automatically set to our three core categories. If you decide you want
          more variety, you can upgrade to Premium any time.
        </p>
        <p>
          On Premium, you can toggle all 13 categories on or off whenever your needs change. Remodeling
          your home? Turn on Home &amp; DIY. Project finished? Turn it back off.
        </p>
      </>
    ),
  },
  {
    q: 'How are deals selected?',
    a: (
      <>
        <p>
          We use AI to do the window shopping for you. Our system is subscribed to over 500 brand
          newsletters. Once a week, our AI scans thousands of these emails, filters out the fluff (like
          “Check out our new blog post”), and identifies only the actual discounts.
        </p>
        <p>
          On the Free Tier, we only show you deals that are 40% off or higher.
          <br />
          On Premium, you set your own threshold (20%, 30%, 50%+).
        </p>
        <p>This means you only see the math that matters, curated into a single, easy-to-read dossier.</p>
      </>
    ),
  },
  {
    q: 'How are brands prioritized?',
    a: (
      <>
        <p>A few factors work together to decide what shows up first.</p>
        <p>
          The biggest driver is savings. A 60% off deal ranks above a 20% off deal, every time. Beyond
          that, we factor in store tier. A sale at a higher-end retailer gets a meaningful boost over the
          same discount at a store that’s always running promotions. The logic is simple: a rare sale at a
          premium brand is more noteworthy than a perpetual 30% off at a store where 30% off is basically
          the regular price.
        </p>
        <p>Free shipping deals are always shown last, they’re nice, but they’re not the reason you’re here.</p>
      </>
    ),
  },
  {
    q: 'When will paid tier launch?',
    a: (
      <p>
        We’re working on it. Join the free tier now and you’ll be first to know when paid launches. Your
        preferences and history carry over automatically.
      </p>
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
    issue_number?: number
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
              {edition?.issue_number ? `Issue No. ${edition.issue_number} · ` : ''}
              {today}
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
            <MaskLines lines={['Your inbox']} stagger={0} />
            <br />
            <MaskLines
              lines={[
                <span key="lying" className="it" style={{ color: 'var(--olive-deep)' }}>
                  is lying
                </span>,
              ]}
              delay={120}
            />
            <br />
            <MaskLines lines={['to you.']} delay={260} />
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
                Most of what hits your inbox is noise dressed up as opportunity. We look at everything so
                you don’t have to.{' '}
                <em style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)' }}>
                  One email. Once a week. Only what clears the bar.
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
                b: 'One email. Thursday morning. Only what clears the 40% bar — categorized, tagged, ready to act on.',
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
                <div
                  style={{
                    position: 'absolute',
                    top: 28,
                    right: 28,
                    border: '1px solid var(--paper-on-ink-25)',
                    padding: '6px 12px',
                    fontSize: 10,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    color: 'var(--paper)',
                  }}
                >
                  Coming Soon
                </div>
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
                  href="/login"
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
                  Get Started <span className="arr">→</span>
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
