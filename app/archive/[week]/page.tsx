import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { notFound } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { Reveal } from '@/components/Reveal'
import { FlapNumber } from '@/components/FlapNumber'
import { ALL_CATEGORIES, CATEGORY_LABELS, FREE_CATEGORIES } from '@/types'
import { rankDeals, getDealLink, formatExpiryDate, formatSavings, isJunkDeal } from '@/lib/deals'
import { fixRetailerCase } from '@/lib/stores'
import type { Deal, Category } from '@/types'

export const dynamic = 'force-dynamic'

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

  // Public archive shows only what the FREE tier sees: junk filtered out
  // (welcome / loyalty / FTD / store cash etc.), only FREE_CATEGORIES, and
  // only deals with at least 40% off (or special-type deals — bogo / free-
  // item / free-shipping which are inherently meaningful regardless of pct).
  const FREE_TIER_PASSTHROUGH_TYPES = new Set([
    'bogo-free',
    'bogo-half',
    'free-item',
    'free-shipping',
  ])

  const allDeals = ((dealsData || []) as Deal[])
    .filter((d) => !isJunkDeal(d))
    .filter((d) =>
      d.categories.some((c) => FREE_CATEGORIES.includes(c as Category))
    )
    .filter((d) => {
      if (FREE_TIER_PASSTHROUGH_TYPES.has(d.deal_type)) return true
      return (d.percent_off ?? 0) >= 40
    })

  // Title-case all-lowercase legacy retailer names ("carter's" → "Carter's")
  const normalizedDeals = allDeals.map((d) => ({
    ...d,
    retailer: fixRetailerCase(d.retailer),
  }))

  const weekDate = parseISO(edition.week_of)

  // Group deals by FREE category, dedupe by id within each category
  const byCategory: Partial<Record<Category, Deal[]>> = {}
  for (const deal of normalizedDeals) {
    for (const cat of deal.categories) {
      if (!FREE_CATEGORIES.includes(cat as Category)) continue
      if (!byCategory[cat as Category]) byCategory[cat as Category] = []
      byCategory[cat as Category]!.push(deal)
    }
  }
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

  return (
    <>
      <Nav />

      {/* ── Top issue strip ───────────────────────────────────────────── */}
      <section
        style={{
          background: 'var(--ink)',
          color: 'var(--paper)',
          padding: '24px 0',
          borderBottom: '1px solid var(--paper-on-ink-15)',
        }}
      >
        <div
          className="wrap"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <span className="t-meta" style={{ color: 'var(--paper-on-ink-55)' }}>
            This Week&rsquo;s Brief
          </span>
          <span className="t-meta">
            Week of {format(weekDate, 'MMMM d, yyyy')}
          </span>
          <span className="t-meta" style={{ color: 'var(--paper-on-ink-55)' }}>
            {edition.issue_number ? `Issue No. ${edition.issue_number}` : 'Weekly Brief'}
          </span>
        </div>
      </section>

      {/* ── Dark hero ────────────────────────────────────────────────── */}
      <section
        style={{
          background: 'var(--ink)',
          color: 'var(--paper)',
          padding: 'clamp(64px, 8vw, 100px) 0 clamp(80px, 9vw, 120px)',
        }}
      >
        <div className="wrap">
          <Reveal>
            <div className="t-eyebrow" style={{ color: 'var(--olive)' }}>
              {edition.issue_number ? `Issue No. ${edition.issue_number}` : 'Weekly Brief'}
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 300,
                fontSize: 'clamp(56px, 8vw, 120px)',
                marginTop: 24,
                lineHeight: 1,
                letterSpacing: '-0.03em',
                color: 'var(--paper)',
              }}
            >
              The{' '}
              <em style={{ color: 'var(--olive)', fontWeight: 300 }}>finest</em>
              <br />
              deals, curated.
            </h1>
          </Reveal>
          <Reveal delay={250}>
            <p
              style={{
                marginTop: 40,
                color: 'var(--paper-on-ink)',
                fontSize: 19,
                lineHeight: 1.55,
                maxWidth: '46ch',
              }}
            >
              {allDeals.length} deals across {orderedCategories.length}{' '}
              {orderedCategories.length === 1 ? 'category' : 'categories'}. Curated
              from {edition.emails_scanned ?? 0} promotional emails.
            </p>
          </Reveal>

          {/* Stats grid */}
          <div
            style={{
              marginTop: 80,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              borderTop: '1px solid var(--paper-on-ink-15)',
            }}
            className="grid-4"
          >
            {[
              [edition.emails_scanned ?? 0, 'Scanned'],
              [edition.deals_found ?? 0, 'Deals Found'],
              [edition.retailers_count ?? 0, 'Retailers'],
              [allDeals.length, 'In This Issue'],
            ].map(([n, l]) => (
              <div
                key={l}
                style={{
                  padding: '32px 0',
                  borderRight: '1px solid var(--paper-on-ink-15)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 56,
                    fontStyle: 'italic',
                    fontWeight: 300,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                    color: 'var(--paper)',
                  }}
                >
                  <FlapNumber value={String(n)} />
                </div>
                <div
                  className="t-meta"
                  style={{ color: 'var(--paper-on-ink-55)', marginTop: 8 }}
                >
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Deals by category ────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(64px, 8vw, 100px) 0' }}>
        <div className="wrap">
          {orderedCategories.length === 0 ? (
            <div style={{ padding: '80px 0', textAlign: 'center' }}>
              <p className="t-meta" style={{ color: 'var(--ink-40)' }}>
                No deals in this edition
              </p>
            </div>
          ) : (
            orderedCategories.map((cat, ci) => {
              const deals = rankDeals(byCategory[cat]!)
              return (
                <div key={cat} style={{ marginBottom: 96 }}>
                  <Reveal>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 24,
                        paddingBottom: 16,
                        borderBottom: '1px solid var(--ink)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        className="t-mono"
                        style={{ color: 'var(--olive-deep)' }}
                      >
                        {String(ci + 1).padStart(2, '0')}
                      </span>
                      <h2
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: 'clamp(36px, 4vw, 56px)',
                          fontStyle: 'italic',
                          fontWeight: 300,
                          letterSpacing: '-0.02em',
                          lineHeight: 1,
                        }}
                      >
                        {CATEGORY_LABELS[cat]}
                      </h2>
                      <span
                        className="t-meta"
                        style={{ marginLeft: 'auto', color: 'var(--ink-40)' }}
                      >
                        {deals.length} deal{deals.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </Reveal>

                  {deals.map((deal, i) => {
                    const link = getDealLink(deal)
                    const expiry = formatExpiryDate(deal.expiration_date)
                    const savings = formatSavings(deal)
                    return (
                      <Reveal key={deal.id} delay={Math.min(i, 6) * 60}>
                        <div
                          className="deal-row"
                          style={{
                            padding: '32px 0',
                            borderBottom: '1px solid var(--ink-08)',
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: 32,
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                marginBottom: 12,
                                flexWrap: 'wrap',
                              }}
                            >
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontFamily: 'var(--font-serif)',
                                  fontSize: 22,
                                  fontStyle: 'italic',
                                  fontWeight: 350,
                                  letterSpacing: '-0.01em',
                                  color: 'var(--ink)',
                                  textDecoration: 'none',
                                }}
                              >
                                {deal.retailer}
                              </a>
                              {deal.promo_code && (
                                <span className="code-badge">{deal.promo_code}</span>
                              )}
                            </div>
                            <p
                              style={{
                                fontSize: 17,
                                color: 'var(--ink-70)',
                                lineHeight: 1.6,
                                maxWidth: '60ch',
                              }}
                            >
                              {deal.description}
                            </p>
                            <div
                              style={{
                                marginTop: 12,
                                display: 'flex',
                                gap: 24,
                                fontSize: 11,
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                color: 'var(--ink-40)',
                                fontWeight: 500,
                                fontFamily: 'var(--font-condensed)',
                                flexWrap: 'wrap',
                              }}
                            >
                              {expiry && <span>Ends {expiry}</span>}
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: 'var(--ink-40)',
                                  textDecoration: 'none',
                                  borderBottom: '1px solid currentColor',
                                }}
                              >
                                View original →
                              </a>
                            </div>
                          </div>

                          {/* Savings — large olive number */}
                          <div style={{ textAlign: 'right' }}>
                            {deal.percent_off ? (
                              <>
                                <div
                                  style={{
                                    fontFamily: 'var(--font-serif)',
                                    fontSize: 'clamp(56px, 7vw, 96px)',
                                    fontWeight: 300,
                                    lineHeight: 1,
                                    letterSpacing: '-0.03em',
                                    color: 'var(--olive-deep)',
                                  }}
                                >
                                  {deal.percent_off}
                                  <span style={{ fontSize: '0.5em' }}>%</span>
                                </div>
                                <div
                                  className="t-meta"
                                  style={{ color: 'var(--ink-40)' }}
                                >
                                  Off
                                </div>
                              </>
                            ) : (
                              <>
                                <div
                                  style={{
                                    fontFamily: 'var(--font-serif)',
                                    fontSize: 'clamp(28px, 3.4vw, 44px)',
                                    fontStyle: 'italic',
                                    fontWeight: 300,
                                    lineHeight: 1,
                                    letterSpacing: '-0.02em',
                                    color: 'var(--olive-deep)',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {savings}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </Reveal>
                    )
                  })}
                </div>
              )
            })
          )}

          {/* Subscribe CTA */}
          <Reveal>
            <div
              className="card card-dark"
              style={{
                padding: 'clamp(40px, 5vw, 64px)',
                marginTop: 64,
                textAlign: 'center',
              }}
            >
              <div className="t-eyebrow" style={{ color: 'var(--olive)' }}>
                Get This Weekly
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 300,
                  fontSize: 'clamp(32px, 3.5vw, 44px)',
                  marginTop: 16,
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  color: 'var(--paper)',
                }}
              >
                Subscribe to Deal Dossier.{' '}
                <em style={{ color: 'var(--olive)', fontWeight: 300 }}>
                  Free. No paywall.
                </em>
              </h3>
              <Link
                href="/login"
                style={{
                  marginTop: 32,
                  fontFamily: 'var(--font-condensed)',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                  border: '1.5px solid var(--paper)',
                  padding: '14px 32px',
                  textDecoration: 'none',
                  display: 'inline-block',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                Subscribe Free <span className="arr">→</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </>
  )
}
