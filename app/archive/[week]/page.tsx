import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { notFound } from 'next/navigation'
import { DossierLogo } from '@/components/DossierLogo'
import { Nav } from '@/components/Nav'
import { CategoryIcon } from '@/components/CategoryIcon'
import { DealCard } from '@/components/DealCard'
import { ALL_CATEGORIES, CATEGORY_LABELS, FREE_CATEGORIES } from '@/types'
import { rankDeals } from '@/lib/deals'
import type { Deal, Edition, Category } from '@/types'

export const revalidate = 3600

interface Props {
  params: Promise<{ week: string }>
}

export default async function ArchiveWeekPage({ params }: Props) {
  const { week } = await params
  const supabase = createServiceClient()

  const { data: edition } = await supabase
    .from('editions')
    .select('*')
    .eq('week_of', week)
    .single()

  if (!edition) notFound()

  const { data: dealsData } = await supabase
    .from('deals')
    .select('*')
    .eq('week_of', week)

  const allDeals = (dealsData || []) as Deal[]
  const weekDate = parseISO(edition.week_of)

  // Group by category
  const byCategory: Partial<Record<Category, Deal[]>> = {}
  for (const deal of allDeals) {
    for (const cat of deal.categories) {
      if (!byCategory[cat as Category]) byCategory[cat as Category] = []
      byCategory[cat as Category]!.push(deal)
    }
  }

  // Dedupe
  for (const cat of Object.keys(byCategory) as Category[]) {
    const seen = new Set<string>()
    byCategory[cat] = byCategory[cat]!.filter((d) => {
      if (seen.has(d.id)) return false
      seen.add(d.id)
      return true
    })
  }

  const orderedCategories = ALL_CATEGORIES.filter(
    (c) => byCategory[c] && byCategory[c]!.length > 0
  )

  const accent = getSeasonalAccent()

  return (
    <div style={{ minHeight: '100vh', background: 'oklch(88% 0.006 280)' }}>
      <Nav />

      {/* Email render */}
      <div className="remail-wrap" style={{ padding: '40px 20px 80px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 680 }}>
          <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'oklch(55% 0.01 280)', marginBottom: 12, textAlign: 'center' }}>
            Email Layout 680px · {edition.issue_number ? `Issue No. ${edition.issue_number}` : 'Weekly Brief'}
          </p>

          <div style={{ background: 'oklch(98% 0.004 90)' }}>
            {/* Header */}
            <div style={{ padding: '32px 48px 24px', borderBottom: '1px solid oklch(85% 0.008 280)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <DossierLogo size={28} wordmarkSize={22} />
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(62% 0.010 280)', textAlign: 'right', lineHeight: 1.7 }}>
                {edition.issue_number ? `Issue No. ${edition.issue_number}` : 'Weekly Brief'}<br />
                Week of {format(weekDate, 'MMMM d, yyyy')}
              </div>
            </div>

            {/* Hero */}
            <div style={{ background: 'oklch(9% 0.010 280)', padding: '48px 48px 40px' }}>
              <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: accent, marginBottom: 16 }}>
                This Week's Brief
              </p>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 52, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 0.95, color: 'oklch(98% 0.004 90)', marginBottom: 24 }}>
                The <em style={{ fontStyle: 'italic' }}>finest</em><br />deals, curated.
              </h1>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'oklch(72% 0.005 280)', lineHeight: 1.6, maxWidth: 440 }}>
                {allDeals.length} deals across {orderedCategories.length} categories. Curated from {edition.emails_scanned} promotional emails.
              </p>
            </div>

            {/* Stats */}
            <div style={{ borderBottom: '1px solid oklch(85% 0.008 280)', display: 'flex' }}>
              {[
                [edition.emails_scanned, 'Emails Scanned'],
                [edition.deals_found, 'Deals Found'],
                [edition.retailers_count, 'Retailers'],
                [allDeals.length, 'In This Issue'],
              ].map(([n, l]) => (
                <div key={l} style={{ flex: 1, padding: '24px 32px', borderRight: '1px solid oklch(85% 0.008 280)', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em', color: 'oklch(9% 0.010 280)' }}>{n}</div>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(62% 0.010 280)', marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Categories + deals */}
            {orderedCategories.map((cat) => {
              const deals = rankDeals(byCategory[cat]!)
              return (
                <div key={cat}>
                  <div style={{ height: 40 }} />
                  {/* Category header */}
                  <div style={{ padding: '0 48px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 0 }}>
                    <CategoryIcon category={cat} size={18} />
                    <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: accent }}>
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'oklch(85% 0.008 280)' }} />
                    <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'oklch(62% 0.010 280)' }}>
                      {deals.length} Deal{deals.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {/* Deals */}
                  <div style={{ padding: '0 48px' }}>
                    {deals.map((deal) => (
                      <DealCard key={deal.id} deal={deal} />
                    ))}
                  </div>
                </div>
              )
            })}

            <div style={{ height: 40 }} />

            {/* Upgrade CTA (archive view) */}
            <div style={{ padding: '0 48px 48px' }}>
              <div style={{ background: 'oklch(94% 0.005 280)', padding: 32 }}>
                <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: accent, marginBottom: 8 }}>
                  Get This Weekly
                </p>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 300, letterSpacing: '-0.01em', color: 'oklch(9% 0.010 280)', marginBottom: 12 }}>
                  Subscribe to Deal Dossier. Free. No paywall.
                </p>
                <Link href="/login" style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', background: 'oklch(9% 0.010 280)', color: 'oklch(98% 0.004 90)', textDecoration: 'none', padding: '14px 32px', display: 'inline-block' }}>
                  Subscribe Free
                </Link>
              </div>
            </div>

            {/* Footer */}
            <div style={{ background: 'oklch(9% 0.010 280)', padding: '32px 48px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid oklch(25% 0.01 280)' }}>
                <DossierLogo size={20} dark wordmarkSize={18} />
                <div style={{ display: 'flex', gap: 20 }}>
                  {['Archive', 'Preferences', 'Unsubscribe'].map((l) => (
                    <Link key={l} href={l === 'Archive' ? '/archive' : l === 'Preferences' ? '/preferences' : '/unsubscribe'} style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(55% 0.01 280)', textDecoration: 'none' }}>{l}</Link>
                  ))}
                </div>
              </div>
              <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.12em', color: 'oklch(45% 0.01 280)', lineHeight: 1.7 }}>
                You are receiving this because you subscribed to Deal Dossier Weekly. Deals are curated editorially and may include affiliate relationships. Pricing and availability subject to change without notice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getSeasonalAccent(): string {
  const m = new Date().getMonth() + 1
  if (m >= 3 && m <= 5) return 'oklch(64% 0.160 22)'
  if (m >= 6 && m <= 8) return 'oklch(56% 0.160 248)'
  if (m >= 9 && m <= 11) return 'oklch(62% 0.155 48)'
  return 'oklch(42% 0.120 168)'
}
