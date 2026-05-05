import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { Reveal } from '@/components/Reveal'

export const dynamic = 'force-dynamic'

export default function PricingSuccessPage() {
  return (
    <>
      <Nav />

      <section
        style={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          padding: 'clamp(80px, 10vw, 140px) 0',
        }}
      >
        <div className="wrap" style={{ maxWidth: 720 }}>
          <Reveal>
            <div className="t-eyebrow" style={{ color: 'var(--olive-deep)' }}>
              ✓ Welcome to Personal Shopper
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
              You&rsquo;re{' '}
              <em style={{ color: 'var(--olive-deep)', fontWeight: 300 }}>in.</em>
            </h1>
          </Reveal>
          <Reveal delay={220}>
            <p
              style={{
                marginTop: 32,
                color: 'var(--ink-70)',
                fontSize: 17,
                lineHeight: 1.55,
                maxWidth: '46ch',
              }}
            >
              Payment confirmed. Your account is being upgraded — full access to
              all categories, custom filters, and flexible scheduling. Head to
              your settings to dial it in.
            </p>
          </Reveal>
          <Reveal delay={320}>
            <Link
              href="/preferences"
              className="btn-primary"
              style={{ marginTop: 40 }}
            >
              Open settings <span className="arr">→</span>
            </Link>
          </Reveal>
          <div className="t-meta" style={{ marginTop: 24, color: 'var(--ink-40)' }}>
            A confirmation email is on its way from Stripe.
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
