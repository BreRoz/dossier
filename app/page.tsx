'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DossierLogo, DossierMark } from '@/components/DossierLogo'
import { CategoryIcon } from '@/components/CategoryIcon'
import type { Category } from '@/types'
import { ALL_CATEGORIES, CATEGORY_LABELS } from '@/types'

const SEASONS = {
  spring: 'oklch(64% 0.160 22)',
  summer: 'oklch(56% 0.160 248)',
  fall: 'oklch(62% 0.155 48)',
  winter: 'oklch(42% 0.120 168)',
}

function getCurrentSeason(): keyof typeof SEASONS {
  const m = new Date().getMonth() + 1
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'fall'
  return 'winter'
}

const SAMPLE_DEALS = [
  {
    category: 'fashion' as Category,
    retailer: 'Nordstrom',
    description: "Up to 40% off select women's outerwear: Barbour, Eileen Fisher, Vince, and Theory. No additional exclusions.",
    code: 'DOSSIER20',
    savings: '40%',
  },
  {
    category: 'beauty' as Category,
    retailer: 'Sephora',
    description: 'Savings Event: Rouge members receive 20% off all purchases including prestige skincare and fragrance.',
    expiry: 'Apr 21–29',
    savings: '20%',
  },
  {
    category: 'tech' as Category,
    retailer: 'Apple',
    description: 'Refurbished MacBook Pro M4, certified with full warranty and AppleCare eligible. Up to $400 off retail.',
    expiry: 'While supplies last',
    savings: '$400',
  },
]

const MARQUEE_RETAILERS = [
  'Nordstrom', 'Sephora', 'Crate & Barrel', 'Apple', 'Net-a-Porter',
  'Restoration Hardware', 'Saks Fifth Avenue', 'Whole Foods', 'Delta',
  'Home Depot', 'Equinox', 'Bluemercury', 'Nike', 'Target', 'Macy\'s',
]

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [zip, setZip] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [accent, setAccent] = useState(SEASONS[getCurrentSeason()])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, zip_code: zip }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
      } else {
        setSubmitted(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 56,
        display: 'flex', alignItems: 'center', padding: '0 60px',
        background: 'var(--paper)', borderBottom: 'var(--rule)', zIndex: 100,
      }}>
        <DossierLogo size={22} wordmarkSize={18} />
        <ul style={{ display: 'flex', gap: 32, listStyle: 'none', margin: '0 0 0 auto', padding: 0 }}>
          {[['Archive', '/archive'], ['Stores', '/stores'], ['Categories', '#categories']].map(([l, h]) => (
            <li key={l}>
              <a href={h} style={{
                fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 500,
                letterSpacing: '0.2em', textTransform: 'uppercase' as const,
                color: 'var(--ink-40)', textDecoration: 'none',
              }}>{l}</a>
            </li>
          ))}
        </ul>
        <Link href="/login" style={{
          marginLeft: 32, fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.18em', textTransform: 'uppercase' as const,
          background: 'var(--ink)', color: 'var(--paper)',
          padding: '10px 24px', textDecoration: 'none',
        }}>
          Subscribe Free
        </Link>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', paddingTop: 56,
      }}>
        {/* Left */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: '80px 60px', borderRight: 'var(--rule)',
        }}>
          <p style={{
            fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.28em', textTransform: 'uppercase', color: accent, marginBottom: 24,
          }}>Deal Intelligence: Weekly Edition</p>
          <h1 className="t-hero" style={{ marginBottom: 40 }}>
            The deals<br />worth your<br />attention.
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--ink-70)',
            lineHeight: 1.65, maxWidth: 400, marginBottom: 48,
          }}>
            DOSSIER is an editorially curated weekly briefing covering fashion, beauty, home, tech, dining, and more. No noise. No gimmicks. Just the deals that matter.
          </p>

          {submitted ? (
            <div style={{
              border: '1.5px solid var(--ink)', padding: '24px 28px', maxWidth: 420,
            }}>
              <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: 8 }}>Check your inbox</p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-70)', lineHeight: 1.6 }}>
                We sent a magic link to <strong style={{ color: 'var(--ink)' }}>{email}</strong>. Click it to confirm your subscription.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ maxWidth: 420 }}>
              <div style={{ display: 'flex', marginBottom: 12 }}>
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-input"
                  style={{ borderRight: 'none' }}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    fontFamily: 'var(--font-condensed)', fontSize: 12, fontWeight: 600,
                    letterSpacing: '0.18em', textTransform: 'uppercase' as const,
                    background: submitting ? 'var(--ink-40)' : 'var(--ink)', color: 'var(--paper)',
                    border: `1.5px solid ${submitting ? 'var(--ink-40)' : 'var(--ink)'}`,
                    padding: '14px 28px', cursor: submitting ? 'default' : 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {submitting ? 'Sending...' : 'Subscribe'}
                </button>
              </div>
              <input
                type="text"
                placeholder="Zip code (optional)"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="field-input"
                style={{ marginBottom: 12 }}
              />
              {error && (
                <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'oklch(50% 0.2 20)', marginBottom: 8 }}>{error}</p>
              )}
              <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-40)' }}>
                Free forever · Unsubscribe anytime · No spam
              </p>
            </form>
          )}
        </div>

        {/* Right (dark panel) */}
        <div style={{
          background: 'var(--ink)', display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end', padding: '80px 60px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 40, right: -20,
            fontFamily: 'var(--font-serif)', fontSize: 340, fontWeight: 300,
            color: 'oklch(14% 0.01 280)', lineHeight: 1, userSelect: 'none',
            letterSpacing: '-0.04em', pointerEvents: 'none',
          }}>41</div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', gap: 48, marginBottom: 48 }}>
              {[['41', 'Deals this week'], ['13', 'Categories'], ['3', 'Exclusive codes']].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 56, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--paper)', marginBottom: 4 }}>{n}</div>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(55% 0.005 280)' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(['fashion', 'beauty', 'home', 'tech', 'restaurants', 'travel', 'grocery', 'tools'] as Category[]).map((cat) => (
                <div key={cat} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  border: '1px solid oklch(25% 0.01 280)', padding: '8px 14px',
                  fontFamily: 'var(--font-condensed)', fontSize: 10, fontWeight: 500,
                  letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(60% 0.005 280)',
                }}>
                  <CategoryIcon category={cat} size={12} color="oklch(60% 0.005 280)" />
                  {CATEGORY_LABELS[cat]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div style={{
        borderTop: 'var(--rule)', borderBottom: 'var(--rule)',
        overflow: 'hidden', padding: '16px 0', background: 'var(--paper)',
      }}>
        <div style={{
          display: 'flex', gap: 64, animation: 'marquee 32s linear infinite',
          whiteSpace: 'nowrap', width: 'max-content',
        }}>
          {[...MARQUEE_RETAILERS, ...MARQUEE_RETAILERS].map((r, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ width: 5, height: 5, background: accent, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 300, letterSpacing: '0.02em', color: 'var(--ink-40)' }}>{r}</span>
            </span>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '140px 0', borderBottom: 'var(--rule)' }}>
        <div className="wrap">
          <p className="t-section" style={{ marginBottom: 24 }}>How It Works</p>
          <h2 className="t-display" style={{ marginBottom: 80, maxWidth: 600 }}>
            Intelligence over volume. Quality over quantity.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--ink-15)' }}>
            {[
              { n: '01', title: 'AI-Scanned', body: 'Our system reads hundreds of promotional emails weekly, using AI to extract every qualifying deal: retailer, discount, code, and expiration.' },
              { n: '02', title: 'Editorially Filtered', body: 'Only deals that clear our quality threshold make the brief. No noise, no expired codes, no vague "up to" offers unless you want them.' },
              { n: '03', title: 'Personalized to You', body: 'Choose your categories, minimum discount, and send day. Free subscribers get three core categories. Paid unlocks everything.' },
            ].map(({ n, title, body }) => (
              <div key={n} style={{ background: 'var(--paper)', padding: '48px 40px' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 80, fontWeight: 300, color: 'var(--ink-06)', lineHeight: 1, marginBottom: 24, letterSpacing: '-0.04em' }}>{n}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 12 }}>{title}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-70)', lineHeight: 1.65 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SAMPLE DEALS PREVIEW */}
      <section style={{ padding: '140px 0', borderBottom: 'var(--rule)' }}>
        <div className="wrap">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 64 }}>
            <div>
              <p className="t-section" style={{ marginBottom: 12 }}>This Week's Brief</p>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px, 4vw, 60px)', fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.0 }}>
                A preview of the latest issue
              </h2>
            </div>
            <Link href="/archive" className="btn-ghost">View Archive</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--ink-15)', marginBottom: 64 }}>
            {SAMPLE_DEALS.map((deal) => (
              <div key={deal.retailer} style={{ background: 'var(--paper)', padding: '40px 36px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <CategoryIcon category={deal.category} size={14} color={accent} />
                  <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, fontWeight: 600, letterSpacing: '0.24em', textTransform: 'uppercase', color: accent }}>
                    {CATEGORY_LABELS[deal.category]}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 10 }}>{deal.retailer}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-70)', lineHeight: 1.55, marginBottom: 20 }}>{deal.description}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {'code' in deal ? (
                    <span className="t-code">{deal.code}</span>
                  ) : (
                    <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-40)' }}>{deal.expiry}</span>
                  )}
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 300, letterSpacing: '-0.02em' }}>{deal.savings}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-40)', marginBottom: 20 }}>
              38 more deals in this issue
            </p>
            <Link href="/login" className="btn-primary">Read the Full Brief</Link>
          </div>
        </div>
      </section>

      {/* MANIFESTO */}
      <section style={{ background: 'var(--ink)', padding: '140px 0', borderBottom: 'var(--rule)' }}>
        <div className="wrap">
          <div style={{ maxWidth: 860 }}>
            <p style={{
              fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px, 4.5vw, 64px)', fontWeight: 300,
              letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--paper)', marginBottom: 48,
            }}>
              This is not a coupon site. This is <em style={{ fontStyle: 'italic', color: accent }}>deal intelligence</em> for people who value their time and their money equally.
            </p>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: 15, color: 'oklch(60% 0.005 280)',
              lineHeight: 1.65, maxWidth: 500, borderLeft: `2px solid ${accent}`, paddingLeft: 24,
            }}>
              Every week, our system combs through hundreds of promotional emails so you don't have to. The result is a single, focused brief of deals that clear our quality bar.
            </p>
          </div>
        </div>
      </section>

      {/* CATEGORIES GRID */}
      <section id="categories" style={{ padding: '140px 0', borderBottom: 'var(--rule)' }}>
        <div className="wrap">
          <p className="t-section" style={{ marginBottom: 24 }}>Coverage</p>
          <h2 className="t-display" style={{ maxWidth: 500, marginBottom: 0 }}>
            Thirteen categories.<br />One brief.
          </h2>

          <div style={{ marginTop: 64, display: 'flex', gap: 1, background: 'var(--ink-15)', flexWrap: 'wrap' }}>
            {ALL_CATEGORIES.map((cat) => (
              <div key={cat} style={{
                background: 'var(--paper)', padding: '28px 24px',
                display: 'flex', alignItems: 'center', gap: 14,
                minWidth: 200, flex: '1 1 200px',
                transition: 'background 0.15s',
              }}>
                <CategoryIcon category={cat} size={24} />
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
                    {CATEGORY_LABELS[cat]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UPGRADE */}
      <section style={{ padding: '140px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', borderBottom: 'var(--rule)' }}>
        <div className="wrap" style={{ display: 'contents' }}>
          <div style={{ paddingLeft: 60 }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)', fontSize: 'clamp(48px, 5.5vw, 80px)',
              fontWeight: 300, letterSpacing: '-0.025em', lineHeight: 0.96,
            }}>
              Start reading.<br /><em style={{ fontStyle: 'italic' }}>It's free.</em>
            </h2>
          </div>
          <div style={{ paddingRight: 60, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--ink-70)', lineHeight: 1.65 }}>
              Join readers who trust DOSSIER to surface the deals worth knowing about. Free subscribers get fashion, grocery, and restaurants. Upgrade for all 13 categories, custom thresholds, and flexible send days.
            </p>
            <div>
              <p className="t-meta" style={{ marginBottom: 16 }}>Free tier includes</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['Fashion', 'Grocery', 'Restaurants', '40%+ minimum discount', 'Thursday delivery'].map((item) => (
                  <li key={item} style={{
                    fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-70)',
                    paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ width: 4, height: 4, background: accent, borderRadius: '50%', flexShrink: 0 }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/login" className="btn-primary" style={{ alignSelf: 'flex-start' }}>Subscribe Free</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <div className="wrap">
        <footer style={{ padding: '48px 0', display: 'flex', alignItems: 'center', gap: 32, borderTop: 'var(--rule)' }}>
          <DossierLogo size={18} wordmarkSize={14} />
          <ul style={{ display: 'flex', gap: 24, listStyle: 'none', marginLeft: 32, padding: 0 }}>
            {[['Archive', '/archive'], ['Privacy', '/privacy'], ['About', '#how-it-works']].map(([l, h]) => (
              <li key={l}>
                <a href={h} style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-40)', textDecoration: 'none' }}>{l}</a>
              </li>
            ))}
          </ul>
          <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-40)', marginLeft: 'auto' }}>
            © 2026 DOSSIER
          </span>
        </footer>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </>
  )
}
