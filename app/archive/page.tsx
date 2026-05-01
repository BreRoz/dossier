import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { Reveal } from '@/components/Reveal'
import type { Edition } from '@/types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Archive — Deal Dossier',
  description:
    'Browse every past edition of the Deal Dossier weekly deals brief.',
  openGraph: {
    title: 'Archive — Deal Dossier',
    description:
      'Browse every past edition of the Deal Dossier weekly deals brief.',
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
    <>
      <Nav />

      <section style={{ padding: 'clamp(56px, 7vw, 96px) 0 clamp(48px, 6vw, 80px)' }}>
        <div className="wrap">
          <Reveal>
            <div className="t-eyebrow">Archive</div>
          </Reveal>
          <Reveal delay={100}>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 300,
                fontSize: 'clamp(56px, 9vw, 144px)',
                marginTop: 20,
                lineHeight: 0.95,
                letterSpacing: '-0.035em',
                maxWidth: '14ch',
              }}
            >
              Past{' '}
              <em style={{ color: 'var(--olive-deep)', fontWeight: 300 }}>Issues</em>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p
              style={{
                marginTop: 32,
                color: 'var(--ink-70)',
                fontSize: 17,
                lineHeight: 1.55,
                maxWidth: '52ch',
              }}
            >
              Every edition. Searchable, archived, permanent. Browse the full history
              of Deal Dossier.
            </p>
          </Reveal>
        </div>
      </section>

      <section style={{ paddingBottom: 'clamp(56px, 8vw, 120px)' }}>
        <div className="wrap">
          {allEditions.length === 0 ? (
            <div
              style={{
                padding: '80px 0',
                textAlign: 'center',
                borderTop: '1px solid var(--ink-15)',
              }}
            >
              <p className="t-meta" style={{ color: 'var(--ink-40)' }}>
                No editions published yet
              </p>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid var(--ink)' }}>
              {allEditions.map((edition, i) => {
                const weekDate = parseISO(edition.week_of)
                return (
                  <Reveal key={edition.id} delay={Math.min(i, 8) * 60}>
                    <Link
                      href={`/archive/${edition.week_of}`}
                      style={{ display: 'block', textDecoration: 'none' }}
                    >
                      <div
                        className="archive-row"
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            '120px 1fr auto auto auto 60px',
                          gap: 32,
                          padding: '32px 0',
                          borderBottom: '1px solid var(--ink-15)',
                          alignItems: 'baseline',
                          cursor: 'pointer',
                          transition: 'all .35s var(--easing)',
                        }}
                      >
                        <div
                          className="t-mono"
                          style={{ color: 'var(--olive-deep)' }}
                        >
                          {edition.issue_number
                            ? `No. ${String(edition.issue_number).padStart(3, '0')}`
                            : '—'}
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: 'clamp(28px, 3.4vw, 44px)',
                            lineHeight: 1,
                            fontStyle: 'italic',
                            fontWeight: 350,
                            letterSpacing: '-0.015em',
                            color: 'var(--ink)',
                          }}
                        >
                          Week of {format(weekDate, 'MMMM d, yyyy')}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="t-mono" style={{ fontSize: 13 }}>
                            {edition.deals_found ?? '—'}
                          </div>
                          <div
                            className="t-meta"
                            style={{ fontSize: 9, color: 'var(--ink-40)' }}
                          >
                            Deals
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="t-mono" style={{ fontSize: 13 }}>
                            {edition.retailers_count ?? '—'}
                          </div>
                          <div
                            className="t-meta"
                            style={{ fontSize: 9, color: 'var(--ink-40)' }}
                          >
                            Retailers
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="t-mono" style={{ fontSize: 13 }}>
                            {edition.emails_scanned ?? '—'}
                          </div>
                          <div
                            className="t-meta"
                            style={{ fontSize: 9, color: 'var(--ink-40)' }}
                          >
                            Scanned
                          </div>
                        </div>
                        <div
                          style={{
                            textAlign: 'right',
                            fontSize: 24,
                            fontFamily: 'var(--font-serif)',
                            color: 'var(--ink)',
                          }}
                        >
                          →
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  )
}
