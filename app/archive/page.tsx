import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Nav } from '@/components/Nav'
import type { Edition } from '@/types'

export const revalidate = 3600

export const metadata = {
  title: 'Archive — DOSSIER',
  description: 'Browse every past edition of the DOSSIER weekly deals brief.',
  openGraph: {
    title: 'Archive — DOSSIER',
    description: 'Browse every past edition of the DOSSIER weekly deals brief.',
  },
}

export default async function ArchivePage() {
  const supabase = createServiceClient()

  const { data: editions } = await supabase
    .from('editions')
    .select('*')
    .order('week_of', { ascending: false })
    .limit(52)

  const allEditions = (editions || []) as Edition[]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <Nav showSubscribe />

      <div className="wrap" style={{ paddingTop: 80, paddingBottom: 120 }}>
        {/* Header */}
        <div style={{ marginBottom: 80 }}>
          <p className="t-section" style={{ marginBottom: 16 }}>Archive</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(48px, 6vw, 88px)', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 0.92, marginBottom: 24 }}>
            Past Issues
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--ink-70)', lineHeight: 1.65, maxWidth: 480 }}>
            Browse all past editions of DOSSIER. Free subscribers can access the last two weeks. Older issues are available to paid subscribers.
          </p>
        </div>

        {/* Grid */}
        {allEditions.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <p className="t-meta">No editions published yet</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 1, background: 'var(--ink-15)' }}>
            {allEditions.map((edition, i) => {
              const weekDate = parseISO(edition.week_of)
              const isRecent = i < 2 // Free access for last 2 weeks
              const isBlurred = !isRecent

              return (
                <Link
                  key={edition.id}
                  href={`/archive/${edition.week_of}`}
                  style={{ textDecoration: 'none', position: 'relative', display: 'block' }}
                >
                  <div style={{
                    background: 'var(--paper)', padding: '40px 36px',
                    transition: 'background 0.15s', cursor: 'pointer',
                    filter: isBlurred ? 'blur(0)' : 'none',
                  }}>
                    {isBlurred && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(247,246,243,0.85)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <p className="t-meta" style={{ marginBottom: 8 }}>Paid Subscribers Only</p>
                          <Link href="/upgrade" style={{
                            fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600,
                            letterSpacing: '0.18em', textTransform: 'uppercase',
                            background: 'var(--ink)', color: 'var(--paper)',
                            padding: '8px 20px', textDecoration: 'none', display: 'inline-block',
                          }}>Upgrade</Link>
                        </div>
                      </div>
                    )}

                    <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>
                      {edition.issue_number ? `Issue No. ${edition.issue_number}` : 'Weekly Brief'}
                    </p>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 300, letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: 16 }}>
                      Week of {format(weekDate, 'MMMM d, yyyy')}
                    </h2>
                    <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 300, color: 'var(--ink)', lineHeight: 1 }}>{edition.deals_found}</div>
                        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-40)', marginTop: 2 }}>Deals</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 300, color: 'var(--ink)', lineHeight: 1 }}>{edition.retailers_count}</div>
                        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-40)', marginTop: 2 }}>Retailers</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 300, color: 'var(--ink)', lineHeight: 1 }}>{edition.emails_scanned}</div>
                        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-40)', marginTop: 2 }}>Scanned</div>
                      </div>
                    </div>
                    <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-40)' }}>
                      View Issue →
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
