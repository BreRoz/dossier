import Link from 'next/link'
import { Nav } from '@/components/Nav'

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <Nav showSubscribe />

      <div className="wrap" style={{ paddingTop: 80, paddingBottom: 120, maxWidth: 720 }}>
        <p className="t-section" style={{ marginBottom: 16 }}>Legal</p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 56, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 0.95, marginBottom: 48 }}>
          Privacy Policy
        </h1>
        <p className="t-meta" style={{ marginBottom: 48 }}>Last updated: April 2026</p>

        {[
          {
            title: 'Information We Collect',
            body: `We collect your email address when you subscribe to DOSSIER. Optionally, you may provide your zip code to help us tailor deals to your region. We also collect your category and deal-type preferences when you configure your account.`,
          },
          {
            title: 'How We Use Your Information',
            body: `Your email address is used solely to send you the weekly DOSSIER briefing and transactional emails (sign-in links, preference confirmations). We do not sell, rent, or share your personal information with third parties for marketing purposes.`,
          },
          {
            title: 'Affiliate Relationships',
            body: `DOSSIER may earn a commission when you click certain retailer links in our email. These are clearly disclosed in each issue. Affiliate relationships do not influence editorial decisions. Deals are selected on merit alone.`,
          },
          {
            title: 'Data Retention',
            body: `Your account data is retained while your subscription is active. If you unsubscribe, we remove your email from active mailing lists within 24 hours. You may request complete deletion of your data using the unsubscribe link in any email we send.`,
          },
          {
            title: 'Security',
            body: `We use industry-standard encryption (TLS) for data in transit and at rest. Authentication is handled via magic links with no passwords stored. Our infrastructure runs on Supabase and Vercel with enterprise-grade security practices.`,
          },
          {
            title: 'Cookies',
            body: `We use minimal session cookies required for authentication. We do not use tracking cookies or third-party analytics beyond what is necessary to operate the service.`,
          },
          {
            title: 'Your Rights',
            body: `You may request access to, correction of, or deletion of your personal data at any time. You may unsubscribe from all emails at any time using the unsubscribe link in every email we send.`,
          },
          {
            title: 'Contact',
            body: `For questions about this policy, use the unsubscribe link in any DOSSIER email to reach your account settings, or reply directly to any email you receive from us.`,
          },
        ].map(({ title, body }) => (
          <div key={title} style={{ marginBottom: 48, paddingBottom: 48, borderBottom: 'var(--rule)' }}>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 16 }}>
              {title}
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--ink-70)', lineHeight: 1.65 }}>
              {body}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
