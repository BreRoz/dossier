import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import type { Edition } from '@/types'

export const revalidate = 3600

export const metadata = {
  title: 'Archive — Deal Dossier',
  description: 'Browse every past edition of the Deal Dossier weekly deals brief.',
  openGraph: {
    title: 'Archive — Deal Dossier',
    description: 'Browse every past edition of the Deal Dossier weekly deals brief.',
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
    <div style={{ minHeight: '100vh', background: '#f7f6f3', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <div style={{ flex: 1, maxWidth: 1280, margin: '0 auto', width: '100%', padding: '80px 40px 120px' }}>

        {/* Header */}
        <div style={{ marginBottom: 80, borderBottom: '1px solid rgba(10,10,10,0.12)', paddingBottom: 56 }}>
          <p style={{
            fontFamily: 'var(--font-condensed)', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.28em', textTransform: 'uppercase',
            color: 'rgba(10,10,10,0.4)', marginBottom: 20,
          }}>
            Archive
          </p>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 'clamp(48px, 6vw, 88px)',
            fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 0.92, marginBottom: 24,
            color: '#0a0a0a',
          }}>
            Past Issues
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 15,
            color: 'rgba(10,10,10,0.55)', lineHeight: 1.65, maxWidth: 480,
          }}>
            Browse every past edition of Deal Dossier.
          </p>
        </div>

        {/* Grid */}
        {allEditions.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <p style={{
              fontFamily: 'var(--font-condensed)', fontSize: 11,
              letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)',
            }}>
              No editions published yet
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 24,
          }}>
            {allEditions.map((edition) => {
              const weekDate = parseISO(edition.week_of)
              return (
                <Link
                  key={edition.id}
                  href={`/archive/${edition.week_of}`}
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <div style={{
                    background: '#f7f6f3',
                    border: '1px solid rgba(10,10,10,0.10)',
                    padding: '40px 36px',
                    cursor: 'pointer',
                    height: '100%',
                  }}>
                    <p style={{
                      fontFamily: 'var(--font-condensed)', fontSize: 10,
                      letterSpacing: '0.22em', textTransform: 'uppercase',
                      color: 'rgba(10,10,10,0.4)', marginBottom: 14,
                    }}>
                      {edition.issue_number ? `Issue No. ${edition.issue_number}` : 'Weekly Brief'}
                    </p>
                    <h2 style={{
                      fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 300,
                      letterSpacing: '-0.01em', lineHeight: 1.15, marginBottom: 24,
                      color: '#0a0a0a',
                    }}>
                      Week of {format(weekDate, 'MMMM d, yyyy')}
                    </h2>
                    <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
                      {[
                        { val: edition.deals_found,   label: 'Deals' },
                        { val: edition.retailers_count, label: 'Retailers' },
                        { val: edition.emails_scanned,  label: 'Scanned' },
                      ].map(({ val, label }) => (
                        <div key={label}>
                          <div style={{
                            fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 300,
                            color: '#0a0a0a', lineHeight: 1,
                          }}>
                            {val}
                          </div>
                          <div style={{
                            fontFamily: 'var(--font-condensed)', fontSize: 10,
                            letterSpacing: '0.2em', textTransform: 'uppercase',
                            color: 'rgba(10,10,10,0.4)', marginTop: 4,
                          }}>
                            {label}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p style={{
                      fontFamily: 'var(--font-condensed)', fontSize: 10,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      color: 'rgba(10,10,10,0.4)',
                      borderTop: '1px solid rgba(10,10,10,0.08)', paddingTop: 20,
                    }}>
                      View Issue →
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
