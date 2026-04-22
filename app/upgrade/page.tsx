import Link from 'next/link'
import { DossierLogo } from '@/components/DossierLogo'
import { CategoryIcon } from '@/components/CategoryIcon'
import { ALL_CATEGORIES, FREE_CATEGORIES, CATEGORY_LABELS } from '@/types'
import type { Category } from '@/types'

const FREE_CATS: Category[] = ['fashion', 'restaurants', 'grocery']
const PAID_CATS = ALL_CATEGORIES.filter((c) => !FREE_CATS.includes(c))

export default function UpgradePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {/* Nav */}
      <nav style={{
        height: 56, display: 'flex', alignItems: 'center', padding: '0 60px',
        borderBottom: 'var(--rule)', position: 'sticky', top: 0,
        background: 'var(--paper)', zIndex: 10,
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <DossierLogo size={22} wordmarkSize={18} />
        </Link>
      </nav>

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
            custom discount thresholds, deal type controls, and flexible send days.
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
              }}>Forever</span>
            </div>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: 14,
              color: 'var(--ink-70)', lineHeight: 1.6, marginBottom: 40,
            }}>
              The DOSSIER brief for deal-curious readers.
            </p>

            <div style={{ marginBottom: 32 }}>
              <p className="t-meta" style={{ marginBottom: 16 }}>Categories</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {FREE_CATS.map((cat) => (
                  <div key={cat} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    borderBottom: '1px solid var(--ink-06)',
                  }}>
                    <CategoryIcon category={cat} size={16} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600 }}>
                      {CATEGORY_LABELS[cat]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 }}>
              {[
                '40%+ minimum discount',
                'Thursday delivery',
                'Basic deal types',
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
              The full DOSSIER experience, personalized entirely to you.
            </p>

            <div style={{ marginBottom: 32 }}>
              <p style={{
                fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 500,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: 'oklch(55% 0.005 280)', marginBottom: 16,
              }}>All 13 Categories</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {PAID_CATS.map((cat) => (
                  <div key={cat} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    borderBottom: '1px solid oklch(18% 0.01 280)',
                  }}>
                    <CategoryIcon category={cat} size={16} color="oklch(60% 0.005 280)" />
                    <span style={{
                      fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                      color: 'oklch(85% 0.005 280)',
                    }}>
                      {CATEGORY_LABELS[cat]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 }}>
              {[
                'Choose 30%, 40%, or 50%+ threshold',
                'Any send day of the week',
                'All deal type toggles',
                'Up-to deals if you want them',
                'Stackable & loyalty deal alerts',
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
              a: 'Yes, permanently. DOSSIER earns through affiliate relationships: clicking a deal link supports the product. No paywalls on the core experience.',
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
