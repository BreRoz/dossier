import Link from 'next/link'
import { Nav } from '@/components/Nav'

export const metadata = {
  title: 'Upgrade — Deal Dossier',
  description: 'Unlock all 13 deal categories, store controls, age filters, and more with Deal Dossier paid.',
  openGraph: {
    title: 'Upgrade — Deal Dossier',
    description: 'Unlock all 13 deal categories, store controls, age filters, and more.',
  },
}

export default function UpgradePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <Nav showSubscribe />

      <div className="wrap" style={{ paddingTop: 80, paddingBottom: 120 }}>

        {/* Header */}
        <div style={{ marginBottom: 80, borderBottom: 'var(--rule)', paddingBottom: 80 }}>
          <p className="t-section" style={{ marginBottom: 16 }}>Upgrade</p>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(56px, 7vw, 96px)',
            fontWeight: 300,
            letterSpacing: '-0.03em',
            lineHeight: 0.92,
            marginBottom: 32,
          }}>
            Unlock everything.
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 16,
            color: 'var(--ink-70)', lineHeight: 1.65, maxWidth: 520,
          }}>
            The free tier covers the essentials. Paid unlocks all 13 categories,
            store-level controls, age-based filtering, custom discount thresholds,
            full deal type controls, and flexible send days.
          </p>
        </div>

        {/* Comparison grid */}
        <div className="rcompare" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--ink-15)', marginBottom: 80 }}>

          {/* Free */}
          <div style={{ background: 'var(--paper)', padding: '48px 48px 56px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{
                fontFamily: 'var(--font-serif)', fontSize: 48, fontWeight: 300,
                letterSpacing: '-0.02em', color: 'var(--ink)',
              }}>Free</span>
              <span style={{
                fontFamily: 'var(--font-condensed)', fontSize: 10,
                letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-40)',
              }}>No Paywall</span>
            </div>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: 14,
              color: 'var(--ink-70)', lineHeight: 1.6, marginBottom: 40,
            }}>
              The Deal Dossier brief for deal-curious readers. No credit card, no catch.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 }}>
              {[
                '3 core categories (Fashion, Grocery, Restaurants)',
                '40%+ minimum discount',
                'Thursday delivery',
                'Curated deal types',
                'Subscribed stores directory',
              ].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 4, height: 4,
                    background: 'var(--ink-40)', borderRadius: '50%', flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-70)',
                  }}>{item}</span>
                </div>
              ))}
            </div>

            <Link href="/login" className="btn-ghost" style={{ display: 'inline-block' }}>
              Get Started Free
            </Link>
          </div>

          {/* Paid */}
          <div style={{ background: 'var(--ink)', padding: '48px 48px 56px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{
                fontFamily: 'var(--font-serif)', fontSize: 48, fontWeight: 300,
                letterSpacing: '-0.02em', color: 'var(--paper)',
              }}>Paid</span>
              <span style={{
                fontFamily: 'var(--font-condensed)', fontSize: 10,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'oklch(55% 0.005 280)',
              }}>Coming Soon</span>
            </div>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: 14,
              color: 'oklch(60% 0.005 280)', lineHeight: 1.6, marginBottom: 40,
            }}>
              The full Deal Dossier experience, personalized entirely to you.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 }}>
              {[
                'All 13 deal categories — fully adjustable',
                'Choose your minimum discount: 20%, 30%, 40%, or 50%+',
                'Any send day of the week',
                'Toggle individual stores on or off',
                'Age-based store filter ("where people my age shop")',
                'Full deal type controls — BOGO, flash sales, loyalty & more',
                'Stackable & up-to deal alerts',
                'Suggest stores for us to track',
              ].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 4, height: 4,
                    background: 'var(--accent)', borderRadius: '50%', flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: 14,
                    color: 'oklch(70% 0.005 280)',
                  }}>{item}</span>
                </div>
              ))}
            </div>

            <button
              disabled
              style={{
                fontFamily: 'var(--font-condensed)', fontSize: 12, fontWeight: 600,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                background: 'var(--accent)', color: 'var(--paper)',
                border: 'none', padding: '14px 32px', cursor: 'default', opacity: 0.7,
              }}
            >
              Coming Soon
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 640 }}>
          <p className="t-section" style={{ marginBottom: 32 }}>Questions</p>
          {[
            {
              q: 'When will paid tier launch?',
              a: 'We\'re working on it. Join the free tier now and you\'ll be first to know when paid launches. Your preferences and history carry over automatically.',
            },
            {
              q: 'Is the free tier really free?',
              a: 'Yes, permanently. Deal Dossier earns through affiliate relationships: clicking a deal link supports the product. No paywalls on the core experience.',
            },
            {
              q: 'Can I change categories later?',
              a: 'Anytime. Your preferences page lets you toggle categories, and changes take effect with the next edition.',
            },
            {
              q: 'How are deals selected?',
              a: 'Our system reads promotional emails from a dedicated inbox we subscribe to retailer lists with. AI extracts structured deal data, which we filter and rank by your preferences.',
            },
          ].map(({ q, a }) => (
            <div key={q} style={{
              padding: '28px 0', borderBottom: 'var(--rule)',
            }}>
              <h3 style={{
                fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600,
                letterSpacing: '-0.01em', marginBottom: 10,
              }}>{q}</h3>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 14,
                color: 'var(--ink-70)', lineHeight: 1.65,
              }}>{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
