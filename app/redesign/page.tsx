'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function RedesignPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [edition, setEdition] = useState<{
    week_of: string
    deals_found: number
    retailers_count: number
    emails_scanned: number
  } | null>(null)

  useEffect(() => {
    fetch('/api/editions/latest')
      .then((r) => r.json())
      .then((d) => { if (d.edition) setEdition(d.edition) })
      .catch(() => {})
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
        body: JSON.stringify({ email, redirectTo: `${window.location.origin}/auth/callback` }),
      })
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <style>{`
        /* ── Reset ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Page ── */
        .rd-page { background: #f7f6f3; color: #0a0a0a; overflow-x: hidden; }

        /* ── NAV ── */
        .rd-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 40px;
          border-bottom: 1px solid rgba(10,10,10,0.12);
          flex-shrink: 0;
        }
        .rd-nav-link {
          font-family: var(--font-condensed); font-size: 10px; letter-spacing: 0.22em;
          text-decoration: none; color: #0a0a0a;
        }
        .rd-nav-link.active { border-bottom: 1px solid #0a0a0a; padding-bottom: 2px; }
        .rd-nav-hide { display: block; }
        .rd-nav-stats { text-align: right; }
        .rd-nav-stats-week {
          font-family: var(--font-condensed); font-size: 10px; letter-spacing: 0.18em;
          color: #0a0a0a; margin-bottom: 4px;
        }
        .rd-nav-stats-row {
          display: flex; gap: 16px; justify-content: flex-end;
          font-family: var(--font-condensed); font-size: 10px; letter-spacing: 0.15em;
          color: rgba(10,10,10,0.45);
        }
        .rd-nav-stats-row strong {
          color: #0a0a0a; font-weight: 700;
        }

        /* ── FOLD ── */
        .rd-fold { height: 100dvh; display: flex; flex-direction: column; }

        /* ── HEADLINE AREA ── */
        .rd-headline-area {
          flex: 1; display: flex; flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 20px 40px 0;
          overflow: hidden;
        }
        .rd-label {
          text-align: center; flex-shrink: 0;
          font-family: var(--font-condensed); font-size: 11px; letter-spacing: 0.28em;
        }

        /* ── HEADLINE ── */
        .rd-hl {
          flex: 1; display: flex; flex-direction: column; justify-content: center;
          align-items: center;
          line-height: 0.88;
          font-size: min(6.2vw, calc((100dvh - 220px) / 4.6));
        }
        .rd-hl-line {
          display: flex; gap: 0.2em; align-items: baseline; white-space: nowrap;
        }
        .rd-serif { font-family: var(--font-serif); font-weight: 300; }
        .rd-sans  { font-family: var(--font-sans);  font-weight: 800; }


        /* ── BLACK BAR ── */
        .rd-bar {
          background: #0a0a0a; height: 56px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 40px;
        }
        .rd-bar span {
          font-family: var(--font-condensed); font-size: 9px; letter-spacing: 0.22em;
          color: rgba(247,246,243,0.45); white-space: nowrap;
        }

        /* ── SCATTER TEXT ── */
        .rd-scatter {
          display: flex; justify-content: space-between; align-items: flex-start;
          width: 100%; padding: 24px 0; flex-shrink: 0;
        }
        .rd-scatter-col {
          display: flex; flex-direction: column;
          font-family: var(--font-sans); font-size: 11px; font-weight: 700;
          letter-spacing: 0.04em; color: rgba(10,10,10,0.75);
          line-height: 1.25; text-transform: uppercase;
        }

        /* ── SUBSCRIBE (centered, above black bar) ── */
        .rd-subscribe-inline {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          width: 100%; padding-bottom: 28px; flex-shrink: 0;
        }
        .rd-subscribe-form {
          display: flex; width: 100%; max-width: 480px; gap: 0; align-items: center;
        }
        .rd-bar-input {
          flex: 1; background: transparent; border: none;
          border-bottom: 1px solid rgba(10,10,10,0.25);
          color: #0a0a0a; font-family: var(--font-condensed);
          font-size: 11px; letter-spacing: 0.22em; padding: 10px 0; outline: none;
        }
        .rd-bar-input::placeholder { color: rgba(10,10,10,0.3); }
        .rd-bar-btn {
          background: transparent; border: none;
          border-bottom: 1px solid rgba(10,10,10,0.25);
          color: #0a0a0a; font-family: var(--font-condensed);
          font-size: 11px; letter-spacing: 0.28em;
          padding: 10px 0 10px 28px; cursor: pointer; white-space: nowrap;
        }
        .rd-subscribe-fine {
          font-family: var(--font-condensed); font-size: 9px; letter-spacing: 0.22em;
          color: rgba(10,10,10,0.35); text-align: center;
        }
        .rd-bar-sent {
          font-family: var(--font-condensed); font-size: 11px; letter-spacing: 0.22em;
          color: rgba(10,10,10,0.5);
        }

        /* ── BELOW FOLD ── */
        .rd-section { padding: 120px 40px; border-bottom: 1px solid rgba(10,10,10,0.12); }

        /* ── PRICING ── */
        .rd-pricing-label {
          font-family: var(--font-condensed); font-size: 10px; letter-spacing: 0.28em;
          color: rgba(10,10,10,0.4); margin-bottom: 56px;
        }
        .rd-pricing-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 1px; background: rgba(10,10,10,0.12);
        }
        .rd-pricing-tier {
          background: #f7f6f3; padding: 56px 48px;
          display: flex; flex-direction: column; gap: 32px;
        }
        .rd-pricing-tier--dark { background: #0a0a0a; }
        .rd-pricing-name {
          font-size: clamp(40px, 4vw, 64px); font-weight: 300;
          letter-spacing: -0.02em; line-height: 1; color: #0a0a0a;
        }
        .rd-pricing-price {
          display: flex; align-items: baseline; gap: 10px;
        }
        .rd-pricing-price .rd-sans {
          font-size: clamp(56px, 6vw, 96px); font-weight: 800;
          line-height: 1; letter-spacing: -0.03em; color: #0a0a0a;
        }
        .rd-pricing-per {
          font-family: var(--font-condensed); font-size: 10px; letter-spacing: 0.22em;
          color: rgba(10,10,10,0.4);
        }
        .rd-pricing-alt {
          font-family: var(--font-condensed); font-size: 10px; letter-spacing: 0.22em;
          color: rgba(247,246,243,0.4); margin-top: -20px;
        }
        .rd-pricing-list {
          list-style: none; padding: 0; display: flex; flex-direction: column; gap: 12px;
          border-top: 1px solid rgba(10,10,10,0.1); padding-top: 32px;
        }
        .rd-pricing-list li {
          font-family: var(--font-sans); font-size: 13px; color: rgba(10,10,10,0.65);
          line-height: 1.4; display: flex; gap: 12px; align-items: baseline;
        }
        .rd-pricing-list--light li { color: rgba(247,246,243,0.6); }
        .rd-pricing-list--light { border-top-color: rgba(247,246,243,0.1); }
        .rd-pricing-dot {
          font-family: var(--font-condensed); font-size: 10px;
          color: rgba(10,10,10,0.25); flex-shrink: 0;
        }
        .rd-pricing-list--light .rd-pricing-dot { color: rgba(247,246,243,0.25); }
        .rd-pricing-cta {
          font-family: var(--font-condensed); font-size: 11px; letter-spacing: 0.22em;
          text-decoration: none; padding: 14px 0; display: inline-block;
          border-bottom: 1px solid; margin-top: auto;
        }
        .rd-pricing-cta--outline {
          color: #0a0a0a; border-color: rgba(10,10,10,0.25);
        }
        .rd-pricing-cta--fill {
          color: #f7f6f3; border-color: rgba(247,246,243,0.25);
        }

        .rd-footer {
          padding: 32px 40px; display: flex; align-items: center; justify-content: space-between;
        }
        .rd-footer-label { font-family: var(--font-condensed); font-size: 10px; letter-spacing: 0.22em; }
        .rd-footer-links { display: flex; gap: 40px; }
        .rd-footer-link {
          font-family: var(--font-condensed); font-size: 10px; letter-spacing: 0.22em;
          color: rgba(10,10,10,0.4); text-decoration: none;
        }
        .rd-footer-copy { font-family: var(--font-condensed); font-size: 10px; letter-spacing: 0.18em; color: rgba(10,10,10,0.4); }

        /* ════════════════════════════════════════
           TABLET  ≤ 900px
        ════════════════════════════════════════ */
        @media (max-width: 900px) {
          .rd-nav { padding: 18px 28px; }
          .rd-nav-hide { display: none; }

          .rd-headline-area { padding: 16px 28px 0; }
          .rd-hl { font-size: min(7.8vw, calc((100dvh - 200px) / 4.6)); }

          .rd-subline { flex-wrap: wrap; gap: 10px 24px; }

          .rd-subscribe-inline { gap: 16px; }
          .rd-bar { padding: 0 28px; overflow: hidden; gap: 16px; }
          .rd-bar span:nth-child(n+4) { display: none; }

          .rd-section { padding: 80px 28px; }
          .rd-pricing-tier { padding: 40px 32px; }

          .rd-footer { padding: 28px; flex-wrap: wrap; gap: 20px; }
          .rd-footer-links { gap: 24px; }
        }

        /* ════════════════════════════════════════
           MOBILE  ≤ 540px
        ════════════════════════════════════════ */
        @media (max-width: 540px) {
          .rd-nav { padding: 16px 20px; }
          .rd-nav-hide { display: none; }
          .rd-nav-stats { display: none; }

          .rd-headline-area { padding: 14px 20px 0; }

          /* On mobile allow headline lines to wrap so nothing overflows */
          .rd-hl {
            font-size: min(10vw, calc((100dvh - 200px) / 5.5));
          }
          .rd-hl-line { white-space: normal; flex-wrap: wrap; }

          .rd-subline { display: none; }
          .rd-scatter { display: none; }

          .rd-subscribe-form { max-width: 100%; }
          .rd-bar { padding: 0 20px; }
          .rd-bar span:nth-child(n+3) { display: none; }
          .rd-pricing-grid { grid-template-columns: 1fr; }
          .rd-pricing-tier { padding: 40px 24px; }

          .rd-section { padding: 64px 20px; }
          .rd-3col-item { padding: 40px 24px; }

          .rd-cats-hl { font-size: clamp(40px, 10vw, 60px); }
          .rd-cats-item { width: 100%; }

          .rd-footer { flex-direction: column; align-items: flex-start; padding: 24px 20px; }
          .rd-footer-links { flex-wrap: wrap; gap: 16px 24px; }
        }
      `}</style>

      <div className="rd-page">

        {/* ── ABOVE THE FOLD ── */}
        <div className="rd-fold">

          {/* NAV */}
          <nav className="rd-nav">
            <Link href="/"        className="rd-nav-link active">HOME</Link>
            <Link href="/archive" className="rd-nav-link rd-nav-hide">ARCHIVE</Link>
            <Link href="/stores"  className="rd-nav-link rd-nav-hide">STORES</Link>
            <Link href="#about"   className="rd-nav-link rd-nav-hide">ABOUT</Link>
            <div className="rd-nav-stats">
              {edition ? (
                <>
                  <div className="rd-nav-stats-week">
                    WEEK OF {new Date(edition.week_of + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
                  </div>
                  <div className="rd-nav-stats-row">
                    <span><strong>{edition.deals_found}</strong> DEALS</span>
                    <span><strong>{edition.retailers_count}</strong> RETAILERS</span>
                    <span><strong>{edition.emails_scanned}</strong> SCANNED</span>
                  </div>
                </>
              ) : (
                <div className="rd-nav-stats-week" style={{ opacity: 0.3 }}>WEEKLY BRIEF</div>
              )}
            </div>
            <Link href="/login" className="rd-nav-link">SIGN IN</Link>
          </nav>

          {/* HEADLINE AREA */}
          <div className="rd-headline-area">

            <div className="rd-label">( DEAL DOSSIER )</div>

            {/* Giant headline */}
            <div className="rd-hl">
              <div className="rd-hl-line">
                <span className="rd-serif">●</span>
                <span className="rd-serif">DEAL</span>
                <span className="rd-serif">DOSSIER</span>
                <span className="rd-serif">IS</span>
                <span className="rd-serif">A</span>
                <span className="rd-sans">WEEKLY</span>
              </div>
              <div className="rd-hl-line">
                <span className="rd-serif">BRIEFING</span>
                <span className="rd-serif">OF</span>
                <span className="rd-serif">THE</span>
              </div>
              <div className="rd-hl-line">
                <span className="rd-sans">DEALS</span>
                <span className="rd-serif">WORTH</span>
                <span className="rd-serif">YOUR</span>
              </div>
              <div className="rd-hl-line">
                <span className="rd-sans">ATTENTION</span>
              </div>
            </div>

            {/* Scattered vertical text — Signal-A style */}
            <div className="rd-scatter">
              {[
                ['Deal', 'Dossier'],
                ['is', 'an'],
                ['editorially', 'curated'],
                ['weekly', 'briefing'],
                ['covering', 'fashion,'],
                ['beauty,', 'home,'],
                ['tech,', 'dining,'],
                ['and', 'more.'],
              ].map((words, i) => (
                <div key={i} className="rd-scatter-col">
                  {words.map((w) => <span key={w}>{w}</span>)}
                </div>
              ))}
            </div>

            {/* Subscribe form — centered, above the black bar */}
            <div className="rd-subscribe-inline">
              {submitted ? (
                <span className="rd-bar-sent">CHECK YOUR INBOX — MAGIC LINK SENT</span>
              ) : (
                <form className="rd-subscribe-form" onSubmit={handleSubmit}>
                  <input
                    className="rd-bar-input"
                    type="email" required
                    placeholder="YOUR@EMAIL.COM"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button className="rd-bar-btn" type="submit" disabled={submitting}>
                    {submitting ? 'SENDING...' : 'SUBSCRIBE →'}
                  </button>
                </form>
              )}
              <span className="rd-subscribe-fine">FREE · NO PAYWALL · UNSUBSCRIBE ANYTIME</span>
            </div>
          </div>

          {/* BLACK BAR — category / info strip */}
          <div className="rd-bar">
            <span>FASHION · BEAUTY · HOME</span>
            <span>TECH · GROCERY · RESTAURANTS</span>
            <span>HUNDREDS OF EMAILS SCANNED</span>
            <span>DELIVERED EVERY THURSDAY</span>
            <span>FREE TO JOIN</span>
          </div>
        </div>

        {/* ── PRICING ── */}
        <div className="rd-section">
          <div className="rd-pricing">

            {/* Section label */}
            <div className="rd-pricing-label">PRICING</div>

            {/* Two tiers */}
            <div className="rd-pricing-grid">

              {/* FREE */}
              <div className="rd-pricing-tier">
                <div className="rd-pricing-name rd-serif">FREE</div>
                <div className="rd-pricing-price">
                  <span className="rd-sans">$0</span>
                  <span className="rd-pricing-per">/ FOREVER</span>
                </div>
                <ul className="rd-pricing-list">
                  {['Fashion, Grocery & Restaurants','Weekly Thursday delivery','40%+ minimum discount','Browse the archive'].map(f => (
                    <li key={f}><span className="rd-pricing-dot">—</span>{f}</li>
                  ))}
                </ul>
                <Link href="/login" className="rd-pricing-cta rd-pricing-cta--outline">
                  SUBSCRIBE FREE →
                </Link>
              </div>

              {/* PAID */}
              <div className="rd-pricing-tier rd-pricing-tier--dark">
                <div className="rd-pricing-name rd-serif" style={{ color: '#f7f6f3' }}>PAID</div>
                <div className="rd-pricing-price">
                  <span className="rd-sans" style={{ color: '#f7f6f3' }}>$4.99</span>
                  <span className="rd-pricing-per" style={{ color: 'rgba(247,246,243,0.45)' }}>/ MONTH</span>
                </div>
                <div className="rd-pricing-alt">OR $45 / YEAR — SAVE 25%</div>
                <ul className="rd-pricing-list rd-pricing-list--light">
                  {['Everything in Free','All 13 categories','Toggle stores on / off','Deal type filtering','Early Thursday delivery'].map(f => (
                    <li key={f}><span className="rd-pricing-dot">—</span>{f}</li>
                  ))}
                </ul>
                <Link href="/login" className="rd-pricing-cta rd-pricing-cta--fill">
                  GET STARTED →
                </Link>
              </div>

            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="rd-footer">
          <span className="rd-footer-label">( DEAL DOSSIER )</span>
          <div className="rd-footer-links">
            {[['ARCHIVE','/archive'],['STORES','/stores'],['PRIVACY','/privacy']].map(([l,h]) => (
              <Link key={l} href={h} className="rd-footer-link">{l}</Link>
            ))}
          </div>
          <span className="rd-footer-copy">© 2026</span>
        </div>

      </div>
    </>
  )
}
