import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { Reveal } from '@/components/Reveal'
import { UpgradeFlow } from '@/components/UpgradeFlow'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let subscriberTier: 'free' | 'paid' | null = null
  let subscriptionStatus: string | null = null
  if (user?.email) {
    const service = createServiceClient()
    const { data: subscriber } = await service
      .from('subscribers')
      .select('tier, subscription_status')
      .eq('email', user.email)
      .single()
    subscriberTier = subscriber?.tier ?? null
    subscriptionStatus = subscriber?.subscription_status ?? null
  }

  const alreadyPaid =
    subscriberTier === 'paid' &&
    ['active', 'trialing'].includes(subscriptionStatus ?? '')

  return (
    <>
      <Nav />

      <section
        style={{
          padding: 'clamp(80px, 10vw, 140px) 0 80px',
        }}
      >
        <div className="wrap" style={{ maxWidth: 720 }}>
          <Reveal>
            <div className="t-eyebrow">Personal Shopper</div>
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
              Unlock{' '}
              <em style={{ color: 'var(--olive-deep)', fontWeight: 300 }}>
                everything.
              </em>
            </h1>
          </Reveal>
          <Reveal delay={220}>
            <p
              style={{
                marginTop: 32,
                color: 'var(--ink-70)',
                fontSize: 17,
                lineHeight: 1.55,
                maxWidth: '52ch',
              }}
            >
              All 13 categories, custom filters, flexible send days, and store-level
              control. The full Dossier experience.
            </p>
          </Reveal>

          <div style={{ marginTop: 64 }}>
            {!user ? (
              <SignInPrompt />
            ) : alreadyPaid ? (
              <AlreadySubscribed />
            ) : (
              <Reveal delay={320}>
                <UpgradeFlow />
              </Reveal>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}

function SignInPrompt() {
  return (
    <div
      style={{
        border: '1.5px solid var(--ink-15)',
        padding: 32,
        background: 'var(--paper)',
      }}
    >
      <div className="t-eyebrow" style={{ marginBottom: 12 }}>
        Sign in first
      </div>
      <p style={{ color: 'var(--ink-70)', fontSize: 15, lineHeight: 1.55, marginBottom: 24 }}>
        We need to know who you are before we can set up billing. Sign in (or
        sign up — it&rsquo;s the same magic link) and you&rsquo;ll come right
        back here.
      </p>
      <Link
        href="/login?next=/pricing"
        className="btn-primary"
      >
        Sign in <span className="arr">→</span>
      </Link>
    </div>
  )
}

function AlreadySubscribed() {
  return (
    <div
      style={{
        border: '1.5px solid var(--ink-15)',
        padding: 32,
        background: 'var(--paper)',
      }}
    >
      <div className="t-eyebrow" style={{ marginBottom: 12, color: 'var(--olive-deep)' }}>
        ✓ You&rsquo;re subscribed
      </div>
      <p style={{ color: 'var(--ink-70)', fontSize: 15, lineHeight: 1.55, marginBottom: 24 }}>
        You already have an active Personal Shopper subscription. Manage your
        plan, payment method, or cancel from your settings.
      </p>
      <Link href="/preferences" className="btn-primary">
        Manage subscription <span className="arr">→</span>
      </Link>
    </div>
  )
}
