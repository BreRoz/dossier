'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ── Split-flap board ──────────────────────────────────────────────────────────
const FLAP_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789   .,/'

function SplitFlapLine({ text }: { text: string }) {
  const [chars, setChars] = useState<string[]>(() => text.split('').map(() => ' '))
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current || !text) return
    ranRef.current = true

    const target = text.toUpperCase().split('')
    const timers: ReturnType<typeof setTimeout>[] = []

    target.forEach((targetChar, i) => {
      const flips = 10 + Math.floor(Math.random() * 10)
      let count = 0

      const start = setTimeout(() => {
        const tick = setInterval(() => {
          count++
          if (count >= flips) {
            setChars(prev => { const n = [...prev]; n[i] = targetChar; return n })
            clearInterval(tick)
          } else {
            const rand = FLAP_SET[Math.floor(Math.random() * FLAP_SET.length)]
            setChars(prev => { const n = [...prev]; n[i] = rand; return n })
          }
        }, 55)
        timers.push(tick)
      }, i * 45)

      timers.push(start)
    })

    return () => timers.forEach(clearTimeout)
  }, [text])

  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {chars.map((ch, i) => (
        ch === ' ' || ch === ' '
          ? <span key={i} style={{ display: 'inline-block', width: '0.45em' }} />
          : <span key={i} className="sf-char">{ch}</span>
      ))}
    </span>
  )
}

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
        .rd-page { background: var(--paper); color: var(--ink); overflow-x: hidden; }

        /* ── NAV ── */
        .rd-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 40px;
          border-bottom: 1px solid rgba(10,10,10,0.12);
          flex-shrink: 0;
        }
        .rd-nav-link {
          font-family: var(--font-condensed); font-size: 10px; letter-spacing: 0.22em;
          text-decoration: none; color: var(--ink);
        }
        .rd-nav-link.active { border-bottom: 1px solid var(--ink); padding-bottom: 2px; }
        .rd-nav-stats { text-align: right; }
        .rd-nav-stats-week {
          font-family: var(--font-condensed); font-size: 10px; letter-spacing: 0.18em;
          color: var(--ink); margin-bottom: 4px;
        }
        .rd-nav-stats-row {
          display: flex; gap: 16px; justify-content: flex-end;
          font-family: var(--font-condensed); font-size: 10px; letter-spacing: 0.15em;
          color: rgba(10,10,10,0.45);
        }
        .rd-nav-stats-row strong { color: var(--ink); font-weight: 700; }

        /* ── FOLD ── */
        .rd-fold { height: 100dvh; display: flex; flex-direction: column; }

        /* ── HEADLINE AREA ── */
        .rd-headline-area {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: space-between;
          padding: 20px 40px 0; overflow: hidden;
        }
        .rd-label {
          font-family: var(--font-condensed); font-size: 11px; letter-spacing: 0.28em;
        }
        .rd-label-row {
          width: 100%; display: flex; align-items: flex-start;
          justify-content: space-between; flex-shrink: 0;
        }

        /* ── HEADLINE ── */
        .rd-hl {
          flex: 1; display: flex; flex-direction: column;
          justify-content: center; align-items: center;
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
          background: var(--ink); height: 56px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 40px;
        }
        .rd-bar span {
          font-family: var(--font-condensed); font-size: 9px; letter-spacing: 0.22em;
          color: rgba(247,246,243,0.45); white-space: nowrap;
        }

        /* ── DESCRIPTION ── */
        .rd-desc {
          font-family: var(--font-sans); font-size: 11px; font-weight: 700;
          letter-spacing: 0.04em; color: rgba(10,10,10,0.75);
          text-transform: uppercase; text-align: center;
          line-height: 1.7; max-width: 480px;
          flex-shrink: 0; padding: 8px 0 40px;
        }

        /* ── SUBSCRIBE ── */
        .rd-subscribe-inline {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          width: 100%; padding-bottom: 28px; flex-shrink: 0;
        }
        .rd-subscribe-form {
          display: flex; width: 100%; max-width: 480px; align-items: center;
        }
        .rd-bar-input {
          flex: 1; background: transparent; border: none;
          border-bottom: 1px solid rgba(10,10,10,0.25);
          color: var(--ink); font-family: var(--font-condensed);
          font-size: 11px; letter-spacing: 0.22em; padding: 10px 0; outline: none;
        }
        .rd-bar-input::placeholder { color: rgba(10,10,10,0.3); }
        .rd-bar-btn {
          background: transparent; border: none;
          border-bottom: 1px solid rgba(10,10,10,0.25);
          color: var(--ink); font-family: var(--font-condensed);
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
          gap: 24px; background: transparent;
        }
        .rd-pricing-tier {
          background: var(--paper); padding: 56px 48px;
          display: flex; flex-direction: column; gap: 32px;
        }
        .rd-pricing-tier--dark { background: var(--ink); }
        .rd-pricing-name {
          font-size: clamp(40px, 4vw, 64px); font-weight: 300;
          letter-spacing: -0.02em; line-height: 1; color: var(--ink);
        }
        .rd-pricing-price { display: flex; align-items: baseline; gap: 10px; }
        .rd-pricing-price .rd-sans {
          font-size: clamp(56px, 6vw, 96px); font-weight: 800;
          line-height: 1; letter-spacing: -0.03em; color: var(--ink);
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
        .rd-pricing-cta--outline { color: var(--ink); border-color: rgba(10,10,10,0.25); }
        .rd-pricing-cta--fill    { color: var(--paper); border-color: rgba(247,246,243,0.25); }
        .rd-pricing-desc {
          font-family: var(--font-sans); font-size: 13px; line-height: 1.6;
          color: rgba(10,10,10,0.55); margin-top: -16px;
        }

        /* ── FAQ ── */
        .rd-faq { margin-top: 64px; border-top: 1px solid rgba(10,10,10,0.12); }
        .rd-faq-item {
          display: grid; grid-template-columns: 1fr 1fr; gap: 40px;
          padding: 32px 0; border-bottom: 1px solid rgba(10,10,10,0.08);
        }
        .rd-faq-q {
          font-family: var(--font-sans); font-size: 14px; font-weight: 600;
          letter-spacing: -0.01em; color: var(--ink);
        }
        .rd-faq-a {
          font-family: var(--font-sans); font-size: 13px;
          color: rgba(10,10,10,0.55); line-height: 1.65;
        }
        .rd-faq-a p { margin: 0 0 10px; }
        .rd-faq-a p:last-child { margin-bottom: 0; }
        .rd-faq-a {
        }

        /* ── SPLIT-FLAP ── */
        .sf-char {
          display: inline-flex; align-items: center; justify-content: center;
          font-family: 'Courier New', Courier, monospace;
          font-size: 9px; font-weight: 700; line-height: 1;
          color: var(--ink);
          background: #fff;
          padding: 2px 2px;
          min-width: 9px;
          border-radius: 1px;
          box-shadow: inset 0 -1px 0 rgba(0,0,0,0.1);
          position: relative;
        }
        /* hairline fold across the middle of each tile */
        .sf-char::after {
          content: '';
          position: absolute;
          left: 0; right: 0;
          top: 50%;
          height: 1px;
          background: rgba(0,0,0,0.12);
          pointer-events: none;
        }

        /* ── FOOTER ── */
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
          .rd-headline-area { padding: 16px 28px 0; }
          .rd-hl { font-size: min(7.8vw, calc((100dvh - 200px) / 4.6)); }
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
          /* Layout */
          .rd-nav { padding: 16px 16px; }
          .rd-nav-stats { display: none; }
          .rd-label-stats { display: none; }
          .rd-headline-area { padding: 14px 20px 0; }
          .rd-hl { font-size: min(10vw, calc((100dvh - 200px) / 5.5)); align-items: center; }
          .rd-hl-line { white-space: normal; flex-wrap: wrap; justify-content: center; }

          /* Nav links — bigger + less tracking */
          .rd-nav-link { font-size: 12px; letter-spacing: 0.12em; }

          /* Description */
          .rd-desc { font-size: 13px; letter-spacing: 0.02em; line-height: 1.8; }

          /* Subscribe */
          .rd-subscribe-form { max-width: 100%; }
          .rd-bar-input { font-size: 14px; letter-spacing: 0.1em; padding: 12px 0; }
          .rd-bar-btn { font-size: 14px; letter-spacing: 0.12em; padding: 12px 0 12px 20px; }
          .rd-subscribe-fine { font-size: 11px; letter-spacing: 0.1em; }

          /* Black bar */
          .rd-bar { padding: 0 20px; }
          .rd-bar span { font-size: 10px; letter-spacing: 0.1em; }
          .rd-bar span:nth-child(n+3) { display: none; }

          /* Pricing */
          .rd-pricing-grid { grid-template-columns: 1fr; }
          .rd-pricing-tier { padding: 40px 24px; }
          .rd-pricing-label { font-size: 12px; letter-spacing: 0.14em; }
          .rd-pricing-per { font-size: 12px; letter-spacing: 0.12em; }
          .rd-pricing-alt { font-size: 12px; letter-spacing: 0.12em; }
          .rd-pricing-list li { font-size: 15px; }
          .rd-pricing-cta { font-size: 13px; letter-spacing: 0.14em; }
          .rd-pricing-desc { font-size: 14px; }

          /* FAQ */
          .rd-faq-item { grid-template-columns: 1fr; gap: 12px; }
          .rd-faq-q { font-size: 16px; }
          .rd-faq-a { font-size: 15px; }

          /* Footer */
          .rd-section { padding: 64px 20px; }
          .rd-footer { flex-direction: column; align-items: flex-start; padding: 24px 20px; gap: 16px; }
          .rd-footer-links { flex-wrap: wrap; gap: 16px 24px; }
          .rd-footer-label, .rd-footer-link, .rd-footer-copy { font-size: 12px; letter-spacing: 0.12em; }
        }
      `}</style>

      <div className="rd-page">

        {/* ── ABOVE THE FOLD ── */}
        <div className="rd-fold">

          {/* NAV */}
          <nav className="rd-nav">
            <Link href="/"             className="rd-nav-link active">HOME</Link>
            <Link href="/archive"      className="rd-nav-link">ARCHIVE</Link>
            <Link href="/stores"       className="rd-nav-link">STORES</Link>
            <Link href="/preferences"  className="rd-nav-link">SETTINGS</Link>
          </nav>

          {/* HEADLINE AREA */}
          <div className="rd-headline-area">

            {/* Label row: ( DEAL DOSSIER ) left · stats right */}
            <div className="rd-label-row">
              <div className="rd-label">( DEAL DOSSIER )</div>
              <div className="rd-nav-stats rd-label-stats">
                {edition ? (
                  <>
                    <div className="rd-nav-stats-week">
                      <SplitFlapLine text={`WEEK OF ${new Date(edition.week_of + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}`} />
                    </div>
                    <div className="rd-nav-stats-row">
                      <span><SplitFlapLine text={`${edition.deals_found} DEALS`} /></span>
                      <span><SplitFlapLine text={`${edition.retailers_count} RETAILERS`} /></span>
                      <span><SplitFlapLine text={`${edition.emails_scanned} SCANNED`} /></span>
                    </div>
                  </>
                ) : (
                  <div className="rd-nav-stats-week" style={{ opacity: 0.3 }}>WEEKLY BRIEF</div>
                )}
              </div>
            </div>

            {/* Giant headline */}
            <div className="rd-hl">
              <div className="rd-hl-line">
                <img src="/tag-icon.png" alt="" aria-hidden="true" style={{ height: '0.82em', width: 'auto', display: 'inline-block', verticalAlign: 'baseline', position: 'relative', top: '0.04em' }} />
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

            {/* Description paragraph */}
            <p className="rd-desc">
              Deal Dossier is an editorially curated weekly briefing covering fashion, beauty, home, tech, dining, and more.
            </p>

            {/* Subscribe form */}
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

          {/* BLACK BAR */}
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
          <div className="rd-pricing-label">PRICING</div>
          <div className="rd-pricing-grid">

            {/* FREE */}
            <div className="rd-pricing-tier">
              <div className="rd-pricing-name rd-serif">Inbox Cleaner</div>
              <div className="rd-pricing-price">
                <span className="rd-sans">$0</span>
                <span className="rd-pricing-per">/ FOREVER</span>
              </div>
              <ul className="rd-pricing-list">
                {[
                  'Inbox Declutter: Unsubscribe from hundreds of brands immediately; we do the "listening" for you.',
                  'Essential Coverage: Weekly digests covering the "Big Three" (Fashion, Grocery, Restaurants).',
                  'High-Value Only: A strict 40% minimum discount filter ensures you only see the deals actually worth your time.',
                  'The "Thursday Boost": A curated list delivered right before the weekend shopping rush.',
                ].map(f => {
                  const colon = f.indexOf(':')
                  return (
                    <li key={f}>
                      <span className="rd-pricing-dot">—</span>
                      {colon >= 0 ? <><strong>{f.slice(0, colon + 1)}</strong>{f.slice(colon + 1)}</> : f}
                    </li>
                  )
                })}
              </ul>
              <Link href="/login" className="rd-pricing-cta rd-pricing-cta--outline">SUBSCRIBE FREE →</Link>
            </div>

            {/* PAID */}
            <div className="rd-pricing-tier rd-pricing-tier--dark" style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', top: 24, right: 24,
                fontFamily: 'var(--font-condensed)', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                color: 'var(--ink)', background: 'var(--paper)',
                padding: '4px 10px',
              }}>Coming Soon</span>
              <div className="rd-pricing-name rd-serif" style={{ color: 'var(--paper)' }}>Personal Shopper</div>
              <div className="rd-pricing-price">
                <span className="rd-sans" style={{ color: 'var(--paper)' }}>$4.99</span>
                <span className="rd-pricing-per" style={{ color: 'rgba(247,246,243,0.45)' }}>/ MONTH</span>
              </div>
              <div className="rd-pricing-alt">OR $45 / YEAR — SAVE 25%</div>
              <ul className="rd-pricing-list rd-pricing-list--light">
                {[
                  'Total Category Access: Unlock all 13 categories, from Tech and Home Goods to Travel and Beauty.',
                  'Bespoke Filters: You set the bar. Choose a lower 20% threshold for "rarely on sale" brands or a 50% "clearance only" filter.',
                  'Curated for Your Life: Use the Age-Based Filter to see where your peers are shopping and discover brands that actually fit your demographic.',
                  'Granular Control: Toggle specific stores on or off to ignore brands you don\'t like and prioritize your favorites.',
                  'Stackable Alerts: Be the first to know when a sale, a loyalty bonus, and a BOGO offer all hit at once for maximum savings.',
                  'On-Demand Scheduling: Move your delivery day to Tuesday for mid-week grocery planning or Saturday for weekend browsing.',
                ].map(f => {
                  const colon = f.indexOf(':')
                  return (
                    <li key={f}>
                      <span className="rd-pricing-dot">—</span>
                      {colon >= 0 ? <><strong style={{ color: 'var(--paper)' }}>{f.slice(0, colon + 1)}</strong>{f.slice(colon + 1)}</> : f}
                    </li>
                  )
                })}
              </ul>
              <Link href="/login" className="rd-pricing-cta rd-pricing-cta--fill">GET STARTED →</Link>
            </div>

          </div>

          {/* FAQ */}
          <div className="rd-faq">
            {([
              {
                q: 'Is the free tier really free?',
                a: (
                  <>
                    <p>Yes, absolutely.</p>
                    <p>We don&rsquo;t ask for a credit card to get started. The free tier is designed to give you a &lsquo;decluttered&rsquo; inbox experience right away. You get our core &lsquo;Big Three&rsquo; categories (Fashion, Grocery, and Restaurants) and our curated Thursday digest at no cost. We only charge for the Premium Tier if you want to unlock advanced features like custom send days, deep-dive category filters, and store-specific controls.</p>
                  </>
                ),
              },
              {
                q: 'Can I change categories later?',
                a: (
                  <>
                    <p>Yes, you have full control.</p>
                    <p>On the Free Tier, you are automatically set to our three core categories. If you decide you want more variety, you can upgrade to Premium at any time.</p>
                    <p>On the Premium Tier, you can toggle all 13 categories on or off whenever your needs change. For example, if you&rsquo;re suddenly remodeling your home, you can turn on the &lsquo;Home &amp; DIY&rsquo; category and turn it back off once the project is finished.</p>
                  </>
                ),
              },
              {
                q: 'How are deals selected?',
                a: (
                  <>
                    <p>We use AI to do the &lsquo;window shopping&rsquo; for you. Our system is subscribed to over 500+ brand newsletters. Once a week, our AI scans thousands of these emails, filters out the fluff (like &ldquo;Check out our new blog post!&rdquo;), and identifies only the actual discounts.</p>
                    <p>On the Free Tier, we only show you deals that are 40% off or higher.<br />On Premium, you set your own threshold (20%, 30%, 50%+).</p>
                    <p>This means you only see the math that matters, curated into a single, easy-to-read dossier.</p>
                  </>
                ),
              },
              {
                q: 'How are brands prioritized in emails?',
                a: (
                  <>
                    <p>A few factors work together to decide what shows up first.</p>
                    <p>The biggest driver is savings — a 60% off deal ranks above a 20% off deal, every time. Beyond that, we factor in store tier. A sale at a higher-end retailer gets a meaningful boost over the same discount at a store that&rsquo;s always running promotions. The logic is simple: a rare sale at a premium brand is more noteworthy than a perpetual 30% off at a store where 30% off is basically the regular price.</p>
                    <p>Free shipping deals are always shown last — they&rsquo;re nice, but they&rsquo;re not the reason you&rsquo;re here.</p>
                  </>
                ),
              },
              {
                q: 'When will paid tier launch?',
                a: <p>We&rsquo;re working on it. Join the free tier now and you&rsquo;ll be first to know when paid launches. Your preferences and history carry over automatically.</p>,
              },
            ] as { q: string; a: React.ReactNode }[]).map(({ q, a }) => (
              <div key={q} className="rd-faq-item">
                <div className="rd-faq-q">{q}</div>
                <div className="rd-faq-a">{a}</div>
              </div>
            ))}
          </div>

        </div>

        {/* ── FOOTER ── */}
        <div className="rd-footer">
          <span className="rd-footer-label">( DEAL DOSSIER )</span>
          <div className="rd-footer-links">
            {[['ARCHIVE', '/archive'], ['STORES', '/stores'], ['PRIVACY', '/privacy']].map(([l, h]) => (
              <Link key={l} href={h} className="rd-footer-link">{l}</Link>
            ))}
          </div>
          <span className="rd-footer-copy">© 2026</span>
        </div>

      </div>
    </>
  )
}
