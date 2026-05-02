import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { Reveal } from '@/components/Reveal'

export const metadata = {
  title: 'Privacy Policy — Deal Dossier',
}

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: 'We collect your email address when you subscribe. When you configure your account we also collect your delivery preferences (send day, minimum discount threshold), content filters (deal categories, deal types, gender, spend tier), and, for subscribers who choose retailer mode, a list of individual retailers you have selected.',
  },
  {
    title: 'How We Use Your Information',
    body: 'Your email address is used solely to send you the weekly Deal Dossier briefing and transactional emails (sign-in links, preference confirmations). We do not sell, rent, or share your personal information with third parties for marketing purposes.',
  },
  {
    title: 'Affiliate Relationships',
    body: 'Deal Dossier may earn a commission when you click certain retailer links in our email. These are clearly disclosed in each issue. Affiliate relationships do not influence editorial decisions. Deals are selected on merit alone.',
  },
  {
    title: 'Data Retention',
    body: 'Your account data is retained while your subscription is active. If you unsubscribe, we remove your email from active mailing lists within 24 hours. You may request complete deletion of your data using the unsubscribe link in any email we send.',
  },
  {
    title: 'Security',
    body: 'We use industry-standard encryption (TLS) for data in transit and at rest. Authentication is handled via magic links — no passwords are ever created or stored. Our infrastructure runs on Supabase (database and auth), Vercel (hosting), and Resend (email delivery). All three operate enterprise-grade security practices. Your email address is shared with Resend solely for the purpose of delivering sign-in links and your weekly brief.',
  },
  {
    title: 'Cookies',
    body: 'We use minimal session cookies required for authentication. We do not use tracking cookies or third-party analytics beyond what is necessary to operate the service.',
  },
  {
    title: 'Contact',
    body: 'For questions about this policy, use the unsubscribe link in any Deal Dossier email to reach your account settings, or reply directly to any email you receive from us.',
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
              Last Updated: April 2026
            </div>
          </Reveal>

          <div style={{ marginTop: 80 }}>
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
