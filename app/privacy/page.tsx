import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { Reveal } from '@/components/Reveal'

export const metadata = {
  title: 'Privacy Policy — Deal Dossier',
}

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: 'We collect your email address when you subscribe. When you configure your account we also collect your delivery preferences (send day, minimum discount threshold), content filters (deal categories, deal types, gender, spend tier), and, for subscribers who choose retailer mode, a list of individual retailers you have selected. For paid subscribers, we also collect billing information through our payment processor (Stripe) — Hours & Co., LLC does not directly store credit card numbers.',
  },
  {
    title: 'How We Use Your Information',
    body: 'Your email address is used solely to send you the weekly Deal Dossier briefing and transactional emails (sign-in links, preference confirmations, billing receipts). We do not sell, rent, or share your personal information with third parties for marketing purposes.',
  },
  {
    title: 'Affiliate Relationships',
    body: 'Deal Dossier may earn a commission when you click certain retailer links in our email. These are clearly disclosed in each issue. Affiliate relationships do not influence editorial decisions. Deals are selected on merit alone.',
  },
  {
    title: 'Data Retention',
    body: 'Your account data is retained while your subscription is active. If you unsubscribe, we remove your email from active mailing lists within 24 hours. You may request complete deletion of your data using the unsubscribe link in any email we send, or by emailing support@dealdossier.io.',
  },
  {
    title: 'Security',
    body: 'We use industry-standard encryption (TLS) for data in transit and at rest. Authentication is handled via magic links — no passwords are ever created or stored. Hours & Co., LLC, as the data controller, operates Deal Dossier on infrastructure provided by Supabase (database and auth), Vercel (hosting), Resend (email delivery), and Stripe (billing for paid subscribers). All providers operate enterprise-grade security practices. Your email address is shared with Resend solely for the purpose of delivering sign-in links and your weekly brief.',
  },
  {
    title: 'Cookies & Analytics',
    body: 'We use session cookies required for authentication. We also use Google Analytics to understand aggregate site usage — it sets analytics cookies (such as _ga and _ga_*) that do not identify individual users. Free-tier and anonymous visitors see advertisements delivered by Google AdSense, which uses cookies to personalize ads and measure performance; paid subscribers do not see ads. You can opt out of personalized advertising at adssettings.google.com, or block third-party cookies in your browser settings.',
  },
  {
    title: 'Your Rights',
    body: 'You have the right to access, correct, or delete the personal information Hours & Co., LLC holds about you. To exercise these rights, email support@dealdossier.io. If you are located in the European Economic Area, the United Kingdom, or California, you may have additional rights under GDPR or the CCPA — including the right to opt out of the sale or sharing of your personal information. Hours & Co., LLC does not sell your personal information.',
  },
  {
    title: 'Contact',
    body: 'For general questions about this Privacy Policy or about Deal Dossier, email hello@dealdossier.io. For account, billing, or data-deletion requests, email support@dealdossier.io. Both reach Hours & Co., LLC, the operator of Deal Dossier. You can also use the unsubscribe link in any Deal Dossier email to reach your account settings.',
  },
]

export default function PrivacyPage() {
  return (
    <>
      <Nav />

      <section style={{ padding: 'clamp(56px, 7vw, 96px) 0 clamp(56px, 8vw, 120px)' }}>
        <div className="wrap" style={{ maxWidth: 880 }}>
          <Reveal>
            <div className="t-eyebrow">Legal</div>
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
              Privacy{' '}
              <em style={{ color: 'var(--olive-deep)', fontWeight: 300 }}>
                Policy
              </em>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <div
              className="t-meta"
              style={{ marginTop: 24, color: 'var(--ink-40)' }}
            >
              Last Updated: May 2026
            </div>
          </Reveal>

          <Reveal delay={300}>
            <p
              style={{
                marginTop: 40,
                color: 'var(--ink-70)',
                fontSize: 16,
                lineHeight: 1.65,
                maxWidth: '62ch',
              }}
            >
              Deal Dossier is operated by Hours &amp; Co., LLC (&ldquo;we&rdquo;,
              &ldquo;us&rdquo;, &ldquo;our&rdquo;). This Privacy Policy
              describes how we collect, use, and protect your information when
              you visit dealdossier.io or subscribe to the Deal Dossier weekly
              briefing.
            </p>
          </Reveal>

          <div style={{ marginTop: 64 }}>
            {SECTIONS.map(({ title, body }, i) => (
              <Reveal key={title} delay={i * 50}>
                <div
                  style={{
                    paddingTop: 40,
                    paddingBottom: 40,
                    borderTop: '1px solid var(--ink-15)',
                  }}
                >
                  <div
                    className="manifesto-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr',
                      gap: 32,
                    }}
                  >
                    <div className="t-mono" style={{ color: 'var(--olive-deep)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: 12,
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          fontWeight: 500,
                          fontFamily: 'var(--font-sans)',
                          color: 'var(--ink)',
                        }}
                      >
                        {title}
                      </h3>
                      <p
                        style={{
                          marginTop: 16,
                          color: 'var(--ink-70)',
                          fontSize: 16,
                          lineHeight: 1.65,
                          maxWidth: '62ch',
                        }}
                      >
                        {body}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
