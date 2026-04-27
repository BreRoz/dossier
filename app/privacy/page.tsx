import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'Privacy Policy — Deal Dossier',
}

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: 'We collect your email address when you subscribe. When you configure your account we also collect your delivery preferences (send day, minimum discount threshold), content filters (deal categories, deal types, gender, spend tier), and — for subscribers who choose retailer mode — a list of individual retailers you have selected. Zip code is collected optionally and is not required to use the service.',
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
    body: 'We use industry-standard encryption (TLS) for data in transit and at rest. Authentication is handled via magic links with no passwords stored. Our infrastructure runs on Supabase and Vercel with enterprise-grade security practices.',
  },
  {
    title: 'Cookies',
    body: 'We use minimal session cookies required for authentication. We do not use tracking cookies or third-party analytics beyond what is necessary to operate the service.',
  },
  {
    title: 'Your Rights',
    body: 'You may request access to, correction of, or deletion of your personal data at any time. You may unsubscribe from all emails at any time using the unsubscribe link in every email we send.',
  },
  {
    title: 'Contact',
    body: 'For questions about this policy, use the unsubscribe link in any Deal Dossier email to reach your account settings, or reply directly to any email you receive from us.',
  },
]

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f3', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <div style={{ flex: 1, maxWidth: 720, margin: '0 auto', width: '100%', padding: '80px 40px 120px' }}>

        <p style={{
          fontFamily: 'var(--font-condensed)', fontSize: 10, fontWeight: 600,
          letterSpacing: '0.28em', textTransform: 'uppercase',
          color: 'rgba(10,10,10,0.4)', marginBottom: 20,
        }}>
          Legal
        </p>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 'clamp(44px, 6vw, 72px)',
          fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 0.95,
          marginBottom: 32, color: '#0a0a0a',
        }}>
          Privacy Policy
        </h1>
        <p style={{
          fontFamily: 'var(--font-condensed)', fontSize: 10,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'rgba(10,10,10,0.35)', marginBottom: 72,
        }}>
          Last Updated: April 2026
        </p>

        {SECTIONS.map(({ title, body }) => (
          <div key={title} style={{
            marginBottom: 48, paddingBottom: 48,
            borderBottom: '1px solid rgba(10,10,10,0.08)',
          }}>
            <p style={{
              fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: '#0a0a0a', marginBottom: 16,
            }}>
              {title}
            </p>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: 15,
              color: 'rgba(10,10,10,0.65)', lineHeight: 1.65,
            }}>
              {body}
            </p>
          </div>
        ))}
      </div>

      <Footer />
    </div>
  )
}
