import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format, parseISO, subDays } from 'date-fns'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { Reveal } from '@/components/Reveal'
import { FlapNumber } from '@/components/FlapNumber'
import { SuggestionActions } from '@/components/SuggestionActions'
import { RunIngestButton } from '@/components/RunIngestButton'

export const dynamic = 'force-dynamic'

// ── Numbered editorial section header ──────────────────────────────────
function SectionLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="t-meta" style={{ color: 'var(--olive-deep)' }}>
      <span style={{ color: 'var(--ink-25)', marginRight: 10 }}>{n}</span>
      {children}
    </div>
  )
}

// ── Ranked list row (rank + label + count) ─────────────────────────────
function ListRow({
  rank,
  label,
  count,
  countAccent = false,
  labelMono = false,
}: {
  rank: number
  label: React.ReactNode
  count: React.ReactNode
  countAccent?: boolean
  labelMono?: boolean
}) {
  return (
    <div className="admin-list-row">
      <span
        className="t-mono"
        style={{ color: 'var(--ink-40)', minWidth: 22 }}
      >
        {String(rank).padStart(2, '0')}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: labelMono ? 12 : 14,
          fontFamily: labelMono ? 'var(--font-mono)' : 'var(--font-sans)',
          color: labelMono ? 'var(--ink-70)' : 'var(--ink)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        className="t-mono"
        style={{ color: countAccent ? 'var(--olive-deep)' : 'var(--ink-55)' }}
      >
        {count}
      </span>
    </div>
  )
}

export default async function AdminPage() {
  // ── Auth ──────────────────────────────────────────────────────────────
  const authClient = await createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  const adminEmail = process.env.ADMIN_EMAIL
  if (!user || !adminEmail || user.email !== adminEmail) {
    redirect('/')
  }

  const db = createServiceClient()
  const now = new Date()
  const sevenDaysAgo = format(subDays(now, 7), 'yyyy-MM-dd')
  const thirtyDaysAgo = format(subDays(now, 30), 'yyyy-MM-dd')

  // ── Parallel data fetch ───────────────────────────────────────────────
  const [
    { count: totalSubscribers },
    { count: activeSubscribers },
    { data: tierData },
    { count: newThisWeek },
    { data: recentSubscribers },
    { data: editions },
    { count: totalEmailsSent },
    { count: sentThisWeek },
    { data: topRetailers },
    { count: totalEmailsScannedCount },
    { count: totalDealsFoundCount },
    { data: retailerScanLog },
    { data: storeSuggestions },
  ] = await Promise.all([
    db.from('subscribers').select('*', { count: 'exact', head: true }),
    db.from('subscribers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    db.from('subscribers').select('tier').eq('is_active', true),
    db.from('subscribers').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    db.from('subscribers').select('email, tier, created_at').order('created_at', { ascending: false }).limit(12),
    db.from('editions').select('*').order('week_of', { ascending: false }).limit(8),
    db.from('sent_emails').select('*', { count: 'exact', head: true }),
    db.from('sent_emails').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    db.from('deals').select('retailer').gte('created_at', thirtyDaysAgo),
    db.from('processed_emails').select('*', { count: 'exact', head: true }),
    db.from('deals').select('*', { count: 'exact', head: true }),
    db.from('retailer_scan_log').select('retailer, sender_email, emails_processed, deals_extracted').order('emails_processed', { ascending: false }),
    db.from('store_suggestions').select('id, store_name, website, notes, status, created_at').order('created_at', { ascending: false }).limit(50),
  ])

  // ── Derived stats ─────────────────────────────────────────────────────
  const freeCount = (tierData || []).filter((r) => r.tier === 'free').length
  const paidCount = (tierData || []).filter((r) => r.tier === 'paid').length

  // Top retailers (last 30 days)
  const retailerCounts: Record<string, number> = {}
  for (const row of topRetailers || []) {
    if (row.retailer) retailerCounts[row.retailer] = (retailerCounts[row.retailer] || 0) + 1
  }
  const topRetailerList = Object.entries(retailerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const totalEmailsScanned = totalEmailsScannedCount ?? 0
  const totalDealsFound = totalDealsFoundCount ?? 0

  // Newsletter performance — aggregate by retailer
  const retailerAggMap = new Map<
    string,
    { retailer: string; sender_email: string; emails_processed: number; deals_extracted: number }
  >()
  for (const row of retailerScanLog || []) {
    const key = row.retailer
    const existing = retailerAggMap.get(key)
    if (existing) {
      existing.emails_processed += row.emails_processed
      existing.deals_extracted += row.deals_extracted
    } else {
      retailerAggMap.set(key, { ...row })
    }
  }
  const aggregatedScanLog = Array.from(retailerAggMap.values())
  const dealProducers = aggregatedScanLog
    .filter((r) => r.deals_extracted > 0)
    .sort((a, b) => b.deals_extracted - a.deals_extracted)
    .slice(0, 15)
  const zeroDealSenders = aggregatedScanLog
    .filter((r) => r.deals_extracted === 0)
    .sort((a, b) => b.emails_processed - a.emails_processed)
    .slice(0, 15)

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="admin-route">
      <Nav />

      <section style={{ padding: 'clamp(56px, 7vw, 96px) 0 clamp(56px, 7vw, 96px)' }}>
        <div className="wrap">
          {/* Header */}
          <div className="admin-header">
            <div>
              <Reveal>
                <div className="t-eyebrow">Dashboard</div>
              </Reveal>
              <Reveal delay={80}>
                <h1
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 300,
                    fontSize: 'clamp(40px, 5vw, 72px)',
                    marginTop: 16,
                    lineHeight: 1,
                    letterSpacing: '-0.025em',
                  }}
                >
                  Admin{' '}
                  <em style={{ color: 'var(--olive-deep)', fontWeight: 300 }}>Overview</em>
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="t-meta" style={{ marginTop: 16, color: 'var(--ink-40)' }}>
                  Internal Operations · Cron + Pipeline + Subscribers
                </p>
              </Reveal>
            </div>
            <div className="admin-actions">
              <RunIngestButton />
            </div>
          </div>

          {/* 01 Subscribers */}
          <Reveal delay={120}>
            <div className="admin-section-label" style={{ marginTop: 64 }}>
              <SectionLabel n="01">Subscribers</SectionLabel>
            </div>
            <div className="admin-stat-row">
              {[
                {
                  n: totalSubscribers ?? 0,
                  l: 'Total Subscribers',
                  sub: null,
                  accent: false,
                },
                {
                  n: activeSubscribers ?? 0,
                  l: 'Active',
                  sub:
                    totalSubscribers && totalSubscribers > 0
                      ? `${Math.round(((activeSubscribers ?? 0) / totalSubscribers) * 100)}% of total`
                      : null,
                  accent: false,
                },
                { n: freeCount, l: 'Free Tier', sub: null, accent: false },
                { n: paidCount, l: 'Paid Tier', sub: null, accent: false },
                {
                  n: newThisWeek ?? 0,
                  l: 'New This Week',
                  sub: '+ trending',
                  accent: true,
                },
              ].map(({ n, l, sub, accent }) => (
                <div
                  key={l}
                  className={`admin-stat ${accent ? 'admin-stat-accent' : ''}`}
                >
                  <div className="admin-stat-num">
                    <FlapNumber value={String(n)} />
                  </div>
                  <div className="t-meta admin-stat-label">{l}</div>
                  {sub && <div className="admin-stat-sub">{sub}</div>}
                </div>
              ))}
            </div>
          </Reveal>

          {/* 02 Pipeline Totals */}
          <Reveal delay={160}>
            <div className="admin-section-label" style={{ marginTop: 64 }}>
              <SectionLabel n="02">Pipeline Totals</SectionLabel>
            </div>
            <div className="admin-stat-row admin-stat-row-4">
              {[
                { n: totalEmailsScanned, l: 'Emails Scanned' },
                { n: totalDealsFound, l: 'Deals Extracted' },
                { n: totalEmailsSent ?? 0, l: 'Emails Delivered' },
                { n: sentThisWeek ?? 0, l: 'Delivered This Week' },
              ].map(({ n, l }) => (
                <div key={l} className="admin-stat">
                  <div className="admin-stat-num">
                    <FlapNumber value={String(n)} />
                  </div>
                  <div className="t-meta admin-stat-label">{l}</div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* 03 / 04 — Top Retailers · Deal Producers */}
          <div className="admin-3col" style={{ marginTop: 32 }}>
            <Reveal>
              <div className="admin-card admin-card-tight">
                <SectionLabel n="06">Top Retailers · 30 Days</SectionLabel>
                <div className="admin-list" style={{ marginTop: 20 }}>
                  {topRetailerList.length === 0 ? (
                    <p className="t-meta" style={{ color: 'var(--ink-40)' }}>
                      No deals in the last 30 days
                    </p>
                  ) : (
                    topRetailerList.map(([retailer, count], i) => (
                      <ListRow
                        key={retailer}
                        rank={i + 1}
                        label={retailer}
                        count={`${count} deal${count !== 1 ? 's' : ''}`}
                      />
                    ))
                  )}
                </div>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="admin-card admin-card-tight">
                <SectionLabel n="07">Deal-Producing Newsletters</SectionLabel>
                <div className="admin-list" style={{ marginTop: 20 }}>
                  {dealProducers.length === 0 ? (
                    <p className="t-meta" style={{ color: 'var(--ink-40)' }}>
                      No data yet
                    </p>
                  ) : (
                    dealProducers.map((r, i) => (
                      <ListRow
                        key={r.retailer}
                        rank={i + 1}
                        label={r.retailer}
                        count={r.deals_extracted}
                        countAccent
                      />
                    ))
                  )}
                </div>
              </div>
            </Reveal>

            <Reveal delay={160}>
              <div className="admin-card admin-card-tight">
                <SectionLabel n="08">Zero-Deal · Consider Unsub</SectionLabel>
                {zeroDealSenders.length === 0 ? (
                  <p
                    style={{ marginTop: 20, fontSize: 13, color: 'var(--ink-55)' }}
                  >
                    All scanned senders have produced at least one deal.
                  </p>
                ) : (
                  <div className="admin-list" style={{ marginTop: 20 }}>
                    {zeroDealSenders.map((r, i) => (
                      <ListRow
                        key={r.retailer}
                        rank={i + 1}
                        label={r.retailer}
                        count={`${r.emails_processed}`}
                        labelMono={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
          </div>

          {/* 09 Store Suggestions */}
          {(storeSuggestions || []).length > 0 && (
            <Reveal delay={80}>
              <div className="admin-card" style={{ marginTop: 32 }}>
                <SectionLabel n="09">Store Suggestions · From Paid Users</SectionLabel>
                <div className="admin-table" style={{ marginTop: 24 }}>
                  <div className="admin-table-head">
                    <div>Store</div>
                    <div>Website</div>
                    <div>Notes</div>
                    <div>Status</div>
                    <div>Date</div>
                    <div></div>
                  </div>
                  {(storeSuggestions || []).map((s) => (
                    <div key={s.id} className="admin-table-row">
                      <div
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: 18,
                          fontWeight: 350,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {s.store_name}
                      </div>
                      <div
                        className="t-mono"
                        style={{ fontSize: 12, color: 'var(--ink-55)' }}
                      >
                        {s.website || '—'}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--ink-70)',
                          lineHeight: 1.5,
                        }}
                      >
                        {s.notes || (
                          <span style={{ color: 'var(--ink-25)' }}>—</span>
                        )}
                      </div>
                      <div>
                        {s.status === 'pending' ? (
                          <span className="t-meta" style={{ color: 'var(--ink-40)' }}>
                            ○ Pending
                          </span>
                        ) : (
                          <span
                            className="t-meta"
                            style={{ color: 'var(--olive-deep)' }}
                          >
                            ●{' '}
                            {s.status === 'added'
                              ? 'Added'
                              : s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                          </span>
                        )}
                      </div>
                      <div className="t-meta" style={{ color: 'var(--ink-40)' }}>
                        {format(new Date(s.created_at), 'MMM d')}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <SuggestionActions
                          suggestionId={s.id}
                          storeName={s.store_name}
                          initialStatus={s.status}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          {/* 10 / 11 — Recent Editions · Recent Signups */}
          <div className="admin-2col" style={{ marginTop: 32 }}>
            <Reveal>
              <div className="admin-card">
                <SectionLabel n="10">Recent Editions</SectionLabel>
                <div className="admin-table" style={{ marginTop: 20 }}>
                  <div
                    className="admin-table-head"
                    style={{ gridTemplateColumns: '1.5fr 0.5fr 0.7fr 0.7fr 0.8fr' }}
                  >
                    <div>Week Of</div>
                    <div>Issue</div>
                    <div>Scanned</div>
                    <div>Deals</div>
                    <div>Retailers</div>
                  </div>
                  {!editions || editions.length === 0 ? (
                    <p
                      style={{
                        marginTop: 20,
                        fontSize: 13,
                        color: 'var(--ink-55)',
                      }}
                    >
                      No editions yet.
                    </p>
                  ) : (
                    editions.map((ed) => (
                      <div
                        key={ed.id}
                        className="admin-table-row"
                        style={{ gridTemplateColumns: '1.5fr 0.5fr 0.7fr 0.7fr 0.8fr' }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: 16,
                            fontWeight: 350,
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {format(parseISO(ed.week_of), 'MMM d, yyyy')}
                        </div>
                        <div className="t-mono">
                          {ed.issue_number ? `No. ${ed.issue_number}` : '—'}
                        </div>
                        <div className="t-mono" style={{ color: 'var(--ink-55)' }}>
                          {ed.emails_scanned ?? '—'}
                        </div>
                        <div className="t-mono" style={{ color: 'var(--olive-deep)' }}>
                          {ed.deals_found ?? '—'}
                        </div>
                        <div className="t-mono" style={{ color: 'var(--ink-55)' }}>
                          {ed.retailers_count ?? '—'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="admin-card">
                <SectionLabel n="11">Recent Signups</SectionLabel>
                <div className="admin-table" style={{ marginTop: 20 }}>
                  <div
                    className="admin-table-head"
                    style={{ gridTemplateColumns: '2fr 0.7fr 0.8fr' }}
                  >
                    <div>Email</div>
                    <div>Tier</div>
                    <div>Joined</div>
                  </div>
                  {!recentSubscribers || recentSubscribers.length === 0 ? (
                    <p
                      style={{
                        marginTop: 20,
                        fontSize: 13,
                        color: 'var(--ink-55)',
                      }}
                    >
                      No subscribers yet.
                    </p>
                  ) : (
                    recentSubscribers.map((sub, i) => (
                      <div
                        key={i}
                        className="admin-table-row"
                        style={{ gridTemplateColumns: '2fr 0.7fr 0.8fr' }}
                      >
                        <div
                          className="t-mono"
                          style={{
                            fontSize: 12,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {sub.email}
                        </div>
                        <div>
                          <span className={`tier-badge ${sub.tier}`}>{sub.tier}</span>
                        </div>
                        <div className="t-meta" style={{ color: 'var(--ink-40)' }}>
                          {format(new Date(sub.created_at), 'MMM d')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
