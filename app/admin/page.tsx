import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format, parseISO, subDays } from 'date-fns'
import { Nav } from '@/components/Nav'
import { CategoryIcon } from '@/components/CategoryIcon'
import { ALL_CATEGORIES, CATEGORY_LABELS } from '@/types'
import type { Category } from '@/types'

export const dynamic = 'force-dynamic'

// ─── helpers ──────────────────────────────────────────────────────────────────

function Stat({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div style={{
      flex: 1, padding: '32px 28px',
      borderRight: '1px solid var(--ink-06)',
    }}>
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 44,
        fontWeight: 300,
        letterSpacing: '-0.03em',
        lineHeight: 1,
        color: 'var(--ink)',
        marginBottom: 6,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: 'var(--font-condensed)',
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--ink-40)',
      }}>
        {label}
      </div>
      {sub && (
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          color: 'var(--ink-40)',
          marginTop: 4,
        }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: 'var(--font-condensed)',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: 'var(--ink-40)',
      marginBottom: 20,
      paddingBottom: 12,
      borderBottom: 'var(--rule)',
    }}>
      {children}
    </p>
  )
}

function Bar({ pct, accent = false }: { pct: number; accent?: boolean }) {
  return (
    <div style={{
      height: 4,
      background: 'var(--ink-06)',
      borderRadius: 2,
      overflow: 'hidden',
      flex: 1,
    }}>
      <div style={{
        height: '100%',
        width: `${Math.max(pct, 2)}%`,
        background: accent ? 'var(--accent)' : 'var(--ink)',
        borderRadius: 2,
        transition: 'width 0.3s ease',
      }} />
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  // Auth check
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  const adminEmail = process.env.ADMIN_EMAIL
  if (!user || (adminEmail && user.email !== adminEmail)) {
    redirect('/')
  }

  const db = createServiceClient()
  const now = new Date()
  const sevenDaysAgo = format(subDays(now, 7), 'yyyy-MM-dd')
  const thirtyDaysAgo = format(subDays(now, 30), 'yyyy-MM-dd')

  // ─── parallel data fetch ───────────────────────────────────────────────────
  const [
    { count: totalSubscribers },
    { count: activeSubscribers },
    { data: tierData },
    { count: newThisWeek },
    { data: sendDayData },
    { data: categoryData },
    { data: recentSubscribers },
    { data: editions },
    { count: totalEmailsSent },
    { count: sentThisMonth },
    { data: topRetailers },
    { data: editionStats },
    { data: retailerScanLog },
    { data: toggledStores },
    { data: storeSuggestions },
  ] = await Promise.all([
    db.from('subscribers').select('*', { count: 'exact', head: true }),
    db.from('subscribers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    db.from('subscribers').select('tier').eq('is_active', true),
    db.from('subscribers').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    db.from('subscribers').select('send_day').eq('is_active', true),
    db.from('subscriber_categories').select('category').eq('enabled', true),
    db.from('subscribers').select('email, tier, created_at').order('created_at', { ascending: false }).limit(12),
    db.from('editions').select('*').order('week_of', { ascending: false }).limit(8),
    db.from('sent_emails').select('*', { count: 'exact', head: true }),
    db.from('sent_emails').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    db.from('deals').select('retailer').gte('created_at', thirtyDaysAgo),
    db.from('editions').select('emails_scanned, deals_found'),
    db.from('retailer_scan_log').select('retailer, sender_email, emails_processed, deals_extracted').order('emails_processed', { ascending: false }),
    db.from('subscriber_store_preferences').select('retailer').eq('enabled', true),
    db.from('store_suggestions').select('store_name, website, notes, status, created_at').order('created_at', { ascending: false }).limit(50),
  ])

  // ─── derived stats ─────────────────────────────────────────────────────────

  const freeCount = (tierData || []).filter((r) => r.tier === 'free').length
  const paidCount = (tierData || []).filter((r) => r.tier === 'paid').length

  // Category popularity
  const catCounts: Record<string, number> = {}
  for (const row of (categoryData || [])) {
    catCounts[row.category] = (catCounts[row.category] || 0) + 1
  }
  const sortedCats = ALL_CATEGORIES
    .map((c) => ({ cat: c, count: catCounts[c] || 0 }))
    .sort((a, b) => b.count - a.count)
  const maxCatCount = Math.max(...sortedCats.map((c) => c.count), 1)

  // Send day distribution
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const dayLabels: Record<string, string> = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
    thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
  }
  const dayCounts: Record<string, number> = {}
  for (const row of (sendDayData || [])) {
    dayCounts[row.send_day] = (dayCounts[row.send_day] || 0) + 1
  }
  const maxDayCount = Math.max(...dayOrder.map((d) => dayCounts[d] || 0), 1)

  // Top retailers (last 30 days)
  const retailerCounts: Record<string, number> = {}
  for (const row of (topRetailers || [])) {
    if (row.retailer) retailerCounts[row.retailer] = (retailerCounts[row.retailer] || 0) + 1
  }
  const topRetailerList = Object.entries(retailerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  const maxRetailerCount = Math.max(...topRetailerList.map((r) => r[1]), 1)

  // Edition totals
  const totalEmailsScanned = (editionStats || []).reduce((s, r) => s + (r.emails_scanned || 0), 0)
  const totalDealsFound = (editionStats || []).reduce((s, r) => s + (r.deals_found || 0), 0)

  // Top toggled-on stores
  const toggledStoreCounts: Record<string, number> = {}
  for (const row of (toggledStores || [])) {
    if (row.retailer) toggledStoreCounts[row.retailer] = (toggledStoreCounts[row.retailer] || 0) + 1
  }
  const topToggledStores = Object.entries(toggledStoreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  const maxToggleCount = Math.max(...topToggledStores.map((r) => r[1]), 1)

  // Newsletter performance: split into deal producers vs zero-deal senders
  const dealProducers = (retailerScanLog || []).filter((r) => r.deals_extracted > 0)
    .sort((a, b) => b.deals_extracted - a.deals_extracted)
  const zeroDealSenders = (retailerScanLog || []).filter((r) => r.deals_extracted === 0)
    .sort((a, b) => b.emails_processed - a.emails_processed)
  const maxEmailsProcessed = Math.max(...(retailerScanLog || []).map((r) => r.emails_processed), 1)

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>

      <Nav />

      <div className="wrap" style={{ paddingTop: 64, paddingBottom: 120 }}>

        {/* Header */}
        <div style={{ marginBottom: 56, borderBottom: 'var(--rule)', paddingBottom: 48 }}>
          <p className="t-section" style={{ marginBottom: 12 }}>Dashboard</p>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(40px, 5vw, 72px)',
            fontWeight: 300,
            letterSpacing: '-0.03em',
            lineHeight: 0.95,
          }}>
            Admin Overview
          </h1>
        </div>

        {/* Top stat row */}
        <div className="radmin-stat" style={{
          display: 'flex',
          borderTop: 'var(--rule)',
          borderLeft: '1px solid var(--ink-06)',
          marginBottom: 64,
        }}>
          <Stat value={totalSubscribers ?? 0} label="Total Subscribers" />
          <Stat value={activeSubscribers ?? 0} label="Active" sub={`${totalSubscribers ? Math.round(((activeSubscribers ?? 0) / totalSubscribers) * 100) : 0}% of total`} />
          <Stat value={freeCount} label="Free Tier" />
          <Stat value={paidCount} label="Paid Tier" />
          <Stat value={`+${newThisWeek ?? 0}`} label="New This Week" />
        </div>

        {/* Two-column layout */}
        <div className="r2grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, marginBottom: 64 }}>

          {/* Category popularity */}
          <div>
            <SectionHeader>Category Popularity</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {sortedCats.map(({ cat, count }) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CategoryIcon category={cat as Category} size={14} />
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    fontWeight: 600,
                    width: 96,
                    flexShrink: 0,
                    color: 'var(--ink)',
                  }}>
                    {CATEGORY_LABELS[cat as Category]}
                  </span>
                  <Bar pct={(count / maxCatCount) * 100} />
                  <span style={{
                    fontFamily: 'var(--font-condensed)',
                    fontSize: 11,
                    letterSpacing: '0.05em',
                    color: 'var(--ink-40)',
                    width: 28,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Send day distribution + top retailers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>

            {/* Send day */}
            <div>
              <SectionHeader>Send Day Distribution</SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {dayOrder.map((day) => {
                  const count = dayCounts[day] || 0
                  return (
                    <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        fontFamily: 'var(--font-condensed)',
                        fontSize: 11,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-40)',
                        width: 32,
                        flexShrink: 0,
                      }}>
                        {dayLabels[day]}
                      </span>
                      <Bar pct={(count / maxDayCount) * 100} accent />
                      <span style={{
                        fontFamily: 'var(--font-condensed)',
                        fontSize: 11,
                        letterSpacing: '0.05em',
                        color: 'var(--ink-40)',
                        width: 24,
                        textAlign: 'right',
                        flexShrink: 0,
                      }}>
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pipeline totals */}
            <div>
              <SectionHeader>Pipeline Totals</SectionHeader>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--ink-06)' }}>
                {[
                  { value: totalEmailsScanned.toLocaleString(), label: 'Emails Scanned' },
                  { value: totalDealsFound.toLocaleString(), label: 'Deals Extracted' },
                  { value: (totalEmailsSent ?? 0).toLocaleString(), label: 'Editions Delivered' },
                  { value: (sentThisMonth ?? 0).toLocaleString(), label: 'Sent This Month' },
                ].map(({ value, label }) => (
                  <div key={label} style={{
                    background: 'var(--paper)',
                    padding: '20px 24px',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 28,
                      fontWeight: 300,
                      letterSpacing: '-0.02em',
                      color: 'var(--ink)',
                      lineHeight: 1,
                      marginBottom: 4,
                    }}>
                      {value}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-condensed)',
                      fontSize: 9,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-40)',
                    }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Top retailers */}
        {topRetailerList.length > 0 && (
          <div style={{ marginBottom: 64 }}>
            <SectionHeader>Top Retailers by Deals (Last 30 Days)</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topRetailerList.map(([retailer, count], i) => (
                <div key={retailer} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{
                    fontFamily: 'var(--font-condensed)',
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    color: 'var(--ink-40)',
                    width: 20,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    fontWeight: 600,
                    width: 180,
                    flexShrink: 0,
                    color: 'var(--ink)',
                  }}>
                    {retailer}
                  </span>
                  <Bar pct={(count / maxRetailerCount) * 100} />
                  <span style={{
                    fontFamily: 'var(--font-condensed)',
                    fontSize: 11,
                    color: 'var(--ink-40)',
                    width: 48,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}>
                    {count} deal{count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top toggled-on stores */}
        {topToggledStores.length > 0 && (
          <div style={{ marginBottom: 64 }}>
            <SectionHeader>Most-Wanted Stores (Paid Users Toggled On)</SectionHeader>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-40)', marginBottom: 20, lineHeight: 1.5 }}>
              Stores paid subscribers have explicitly kept active — a signal of demand for similar retailers.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topToggledStores.map(([retailer, count], i) => (
                <div key={retailer} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{
                    fontFamily: 'var(--font-condensed)', fontSize: 10,
                    color: 'var(--ink-40)', width: 20, textAlign: 'right', flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
                    width: 180, flexShrink: 0, color: 'var(--ink)',
                  }}>
                    {retailer}
                  </span>
                  <Bar pct={(count / maxToggleCount) * 100} accent />
                  <span style={{
                    fontFamily: 'var(--font-condensed)', fontSize: 11,
                    color: 'var(--ink-40)', width: 64, textAlign: 'right', flexShrink: 0,
                  }}>
                    {count} user{count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Newsletter performance */}
        {(retailerScanLog || []).length > 0 && (
          <div className="r2grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, marginBottom: 64 }}>

            {/* Deal producers */}
            <div>
              <SectionHeader>Deal-Producing Newsletters</SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dealProducers.slice(0, 15).map((r) => (
                  <div key={r.retailer} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                      flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: 'var(--ink)',
                    }}>
                      {r.retailer}
                    </span>
                    <Bar pct={(r.deals_extracted / Math.max(...dealProducers.map(d => d.deals_extracted), 1)) * 100} accent />
                    <span style={{
                      fontFamily: 'var(--font-condensed)', fontSize: 10, color: 'var(--ink-40)',
                      width: 56, textAlign: 'right', flexShrink: 0,
                    }}>
                      {r.deals_extracted} deal{r.deals_extracted !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Zero-deal senders */}
            <div>
              <SectionHeader>Zero-Deal Senders (Consider Unsubscribing)</SectionHeader>
              {zeroDealSenders.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-40)' }}>
                  All scanned senders have produced at least one deal.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {zeroDealSenders.slice(0, 15).map((r) => (
                    <div key={r.retailer} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                        flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: 'var(--ink-40)',
                      }}>
                        {r.retailer}
                      </span>
                      <Bar pct={(r.emails_processed / maxEmailsProcessed) * 100} />
                      <span style={{
                        fontFamily: 'var(--font-condensed)', fontSize: 10, color: 'var(--ink-40)',
                        width: 64, textAlign: 'right', flexShrink: 0,
                      }}>
                        {r.emails_processed} email{r.emails_processed !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Store suggestions */}
        {(storeSuggestions || []).length > 0 && (
          <div style={{ marginBottom: 64 }}>
            <SectionHeader>Store Suggestions from Paid Users</SectionHeader>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Store', 'Website', 'Notes', 'Status', 'Date'].map((h) => (
                    <th key={h} style={{
                      fontFamily: 'var(--font-condensed)', fontSize: 9, letterSpacing: '0.18em',
                      textTransform: 'uppercase', color: 'var(--ink-40)', textAlign: 'left',
                      paddingBottom: 10, paddingRight: 16, borderBottom: 'var(--rule)', fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(storeSuggestions || []).map((s, i) => (
                  <tr key={i}>
                    <td style={{ padding: '10px 16px 10px 0', borderBottom: '1px solid var(--ink-06)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                      {s.store_name}
                    </td>
                    <td style={{ padding: '10px 16px 10px 0', borderBottom: '1px solid var(--ink-06)', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-40)' }}>
                      {s.website || '—'}
                    </td>
                    <td style={{ padding: '10px 16px 10px 0', borderBottom: '1px solid var(--ink-06)', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-70)', maxWidth: 240 }}>
                      {s.notes || '—'}
                    </td>
                    <td style={{ padding: '10px 16px 10px 0', borderBottom: '1px solid var(--ink-06)' }}>
                      <span style={{
                        fontFamily: 'var(--font-condensed)', fontSize: 9, letterSpacing: '0.15em',
                        textTransform: 'uppercase', padding: '2px 8px', border: '1px solid',
                        borderColor: s.status === 'added' ? 'var(--accent)' : s.status === 'declined' ? 'var(--ink-15)' : 'var(--ink-40)',
                        color: s.status === 'added' ? 'var(--accent)' : 'var(--ink-40)',
                      }}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 0', borderBottom: '1px solid var(--ink-06)', fontFamily: 'var(--font-condensed)', fontSize: 11, color: 'var(--ink-40)', whiteSpace: 'nowrap' }}>
                      {format(new Date(s.created_at), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Two-column bottom: editions + recent signups */}
        <div className="r2grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>

          {/* Recent editions */}
          <div>
            <SectionHeader>Recent Editions</SectionHeader>
            {!editions || editions.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-40)' }}>No editions yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Week Of', 'Issue', 'Scanned', 'Deals', 'Retailers'].map((h) => (
                      <th key={h} style={{
                        fontFamily: 'var(--font-condensed)',
                        fontSize: 9,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-40)',
                        textAlign: 'left',
                        paddingBottom: 10,
                        paddingRight: 16,
                        borderBottom: 'var(--rule)',
                        fontWeight: 500,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editions.map((ed) => (
                    <tr key={ed.id}>
                      <td style={{ padding: '10px 16px 10px 0', borderBottom: '1px solid var(--ink-06)' }}>
                        <Link href={`/archive/${ed.week_of}`} style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--ink)',
                          textDecoration: 'none',
                        }}>
                          {format(parseISO(ed.week_of), 'MMM d, yyyy')}
                        </Link>
                      </td>
                      <td style={{ padding: '10px 16px 10px 0', borderBottom: '1px solid var(--ink-06)', fontFamily: 'var(--font-condensed)', fontSize: 11, color: 'var(--ink-40)', letterSpacing: '0.05em' }}>
                        {ed.issue_number ? `#${ed.issue_number}` : '-'}
                      </td>
                      <td style={{ padding: '10px 16px 10px 0', borderBottom: '1px solid var(--ink-06)', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-70)' }}>
                        {ed.emails_scanned}
                      </td>
                      <td style={{ padding: '10px 16px 10px 0', borderBottom: '1px solid var(--ink-06)', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-70)' }}>
                        {ed.deals_found}
                      </td>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid var(--ink-06)', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-70)' }}>
                        {ed.retailers_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent signups */}
          <div>
            <SectionHeader>Recent Signups</SectionHeader>
            {!recentSubscribers || recentSubscribers.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-40)' }}>No subscribers yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Email', 'Tier', 'Joined'].map((h) => (
                      <th key={h} style={{
                        fontFamily: 'var(--font-condensed)',
                        fontSize: 9,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-40)',
                        textAlign: 'left',
                        paddingBottom: 10,
                        paddingRight: 16,
                        borderBottom: 'var(--rule)',
                        fontWeight: 500,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentSubscribers.map((sub, i) => (
                    <tr key={i}>
                      <td style={{ padding: '9px 16px 9px 0', borderBottom: '1px solid var(--ink-06)', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sub.email}
                      </td>
                      <td style={{ padding: '9px 16px 9px 0', borderBottom: '1px solid var(--ink-06)' }}>
                        <span style={{
                          fontFamily: 'var(--font-condensed)',
                          fontSize: 9,
                          letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                          color: sub.tier === 'paid' ? 'var(--accent)' : 'var(--ink-40)',
                          border: `1px solid ${sub.tier === 'paid' ? 'var(--accent)' : 'var(--ink-15)'}`,
                          padding: '2px 6px',
                        }}>
                          {sub.tier}
                        </span>
                      </td>
                      <td style={{ padding: '9px 0', borderBottom: '1px solid var(--ink-06)', fontFamily: 'var(--font-condensed)', fontSize: 11, color: 'var(--ink-40)', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                        {format(new Date(sub.created_at), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
