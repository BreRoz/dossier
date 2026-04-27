'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { CategoryIcon } from '@/components/CategoryIcon'
import { createClient } from '@/lib/supabase/client'
import type { Category, SpendTier } from '@/types'
import { CATEGORY_LABELS } from '@/types'
import type { StoreRow } from '@/app/api/stores/route'

interface Stats {
  emails_caught: number
  editions_sent: number
  emails_saved: number
}

const ALL_SPEND_TIERS: SpendTier[] = ['$', '$$', '$$$', '$$$$']

const SPEND_TIER_LABELS: Record<SpendTier, string> = {
  '$':    'Budget',
  '$$':   'Mid-Range',
  '$$$':  'Premium',
  '$$$$': 'Luxury',
}

function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

function StatCard({ value, label, sub }: { value: number; label: string; sub?: string }) {
  return (
    <div style={{
      padding: '32px 40px', background: 'rgba(10,10,10,0.04)',
      display: 'flex', flexDirection: 'column', gap: 8, flex: 1,
    }}>
      <div style={{
        fontFamily: 'var(--font-serif)', fontSize: 52, fontWeight: 300,
        letterSpacing: '-0.02em', lineHeight: 1, color: '#0a0a0a',
      }}>
        {fmt(value)}
      </div>
      <div style={{
        fontFamily: 'var(--font-condensed)', fontSize: 12, fontWeight: 600,
        letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)',
      }}>
        {label}
      </div>
      {sub && (
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 14,
          color: 'rgba(10,10,10,0.4)', lineHeight: 1.4,
        }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// Month name from MM-DD-YYYY
function monthAdded(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return ''
  const month = parseInt(parts[0], 10) - 1
  const year  = parseInt(parts[2], 10)
  return new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

// Simple toggle switch component
function ToggleSwitch({
  enabled,
  locked,
  onChange,
}: {
  enabled: boolean
  locked: boolean
  onChange?: (val: boolean) => void
}) {
  return (
    <button
      onClick={() => !locked && onChange?.(!enabled)}
      title={locked ? 'Upgrade to paid to control individual stores' : enabled ? 'Receiving deals — click to mute' : 'Muted — click to unmute'}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none', padding: 0,
        background: locked ? 'rgba(10,10,10,0.12)' : enabled ? '#0a0a0a' : 'rgba(10,10,10,0.12)',
        cursor: locked ? 'not-allowed' : 'pointer',
        position: 'relative', flexShrink: 0, transition: 'background 0.2s',
        opacity: locked ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 2,
        left: enabled && !locked ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: '#f7f6f3',
        transition: 'left 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11,
      }}>
        {locked ? '🔒' : ''}
      </span>
    </button>
  )
}

export default function StoresPage() {
  const supabase = createClient()
  const catDropRef = useRef<HTMLDivElement>(null)

  const [stats, setStats]               = useState<Stats | null>(null)
  const [stores, setStores]             = useState<StoreRow[]>([])
  const [spendFilter, setSpendFilter]   = useState<SpendTier[]>(['$', '$$', '$$$', '$$$$'])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [catDropOpen, setCatDropOpen]   = useState(false)
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [selectedAge, setSelectedAge]   = useState<string>('')
  const [dealCounts, setDealCounts]     = useState<Record<string, number>>({})
  const [isPaid, setIsPaid]             = useState(false)
  const [storePrefs, setStorePrefs]     = useState<Record<string, boolean>>({})
  const [togglingStore, setTogglingStore] = useState<string | null>(null)
  const [suggestName, setSuggestName]     = useState('')
  const [suggestSite, setSuggestSite]     = useState('')
  const [suggestNotes, setSuggestNotes]   = useState('')
  const [suggesting, setSuggesting]       = useState(false)
  const [suggestDone, setSuggestDone]     = useState(false)
  const [suggestError, setSuggestError]   = useState('')

  // Close category dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (catDropRef.current && !catDropRef.current.contains(e.target as Node)) {
        setCatDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const [statsRes, storesRes, prefsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/stores'),
        fetch('/api/preferences'),
      ])

      if (statsRes.ok)  setStats(await statsRes.json())

      if (storesRes.ok) {
        const data = await storesRes.json()
        setStores(data.stores || [])
      }

      if (prefsRes.ok) {
        const data = await prefsRes.json()
        const prefs = data.preferences || {}
        if (prefs.spend_tier_filter?.length) setSpendFilter(prefs.spend_tier_filter)
      }

      // Subscriber tier + store preferences
      const { data: sub } = await supabase
        .from('subscribers')
        .select('tier, id')
        .eq('email', user.email!)
        .single()

      if (sub) {
        const paid = sub.tier === 'paid'
        setIsPaid(paid)

        if (paid) {
          const { data: sp } = await supabase
            .from('subscriber_store_preferences')
            .select('retailer, enabled')
            .eq('subscriber_id', sub.id)

          const prefMap: Record<string, boolean> = {}
          for (const row of sp || []) prefMap[row.retailer] = row.enabled
          setStorePrefs(prefMap)
        }
      }

      // Deal counts per retailer (all time)
      const { data: deals } = await supabase
        .from('deals')
        .select('retailer')

      const counts: Record<string, number> = {}
      for (const row of deals || []) {
        if (row.retailer) {
          const key = row.retailer.toLowerCase()
          counts[key] = (counts[key] || 0) + 1
        }
      }
      setDealCounts(counts)

      setLoading(false)
    }
    load()
  }, [])

  const handleToggle = useCallback(async (retailer: string, enabled: boolean) => {
    if (!isPaid) return
    setTogglingStore(retailer)
    setStorePrefs((prev) => ({ ...prev, [retailer]: enabled }))

    try {
      await fetch('/api/stores/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retailer, enabled }),
      })
    } catch {
      // revert on error
      setStorePrefs((prev) => ({ ...prev, [retailer]: !enabled }))
    } finally {
      setTogglingStore(null)
    }
  }, [isPaid])

  // Unique app categories present in the store list
  const availableCategories = useMemo(() => {
    const seen = new Set<string>()
    for (const s of stores) if (s.appCategory) seen.add(s.appCategory)
    return Array.from(seen).sort()
  }, [stores])

  // Unique age groups present in the store list
  const availableAgeGroups = useMemo(() => {
    const seen = new Set<string>()
    for (const s of stores) if (s.ageGroup) seen.add(s.ageGroup)
    return Array.from(seen)
  }, [stores])

  const visibleStores = useMemo(() => {
    return stores.filter((s) => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
      if (!spendFilter.includes(s.spendTier as SpendTier)) return false
      if (selectedCats.length > 0 && !selectedCats.includes(s.appCategory)) return false
      if (selectedAge && !s.ageGroup.includes(selectedAge)) return false
      return true
    })
  }, [stores, search, spendFilter, selectedCats, selectedAge])

  const toggleCat = (cat: string) => {
    setSelectedCats((cur) =>
      cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat]
    )
  }

  const toggleSpend = (tier: SpendTier) => {
    setSpendFilter((cur) => {
      if (cur.includes(tier)) {
        if (cur.length === 1) return cur
        return cur.filter((t) => t !== tier)
      }
      return [...cur, tier]
    })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f6f3' }}>
        <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'rgba(10,10,10,0.4)' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f3' }}>
      <Nav />

      <div className="wrap" style={{ paddingTop: 64, paddingBottom: 120 }}>

        {/* Header */}
        <div style={{ marginBottom: 48, borderBottom: '1px solid rgba(10,10,10,0.12)', paddingBottom: 40 }}>
          <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: 'rgba(10,10,10,0.4)', marginBottom: 12 }}>Your Account</p>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 48, fontWeight: 300,
            letterSpacing: '-0.02em', marginBottom: 12,
          }}>
            Subscribed Stores
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 15, color: 'rgba(10,10,10,0.4)',
            maxWidth: 520, lineHeight: 1.55,
          }}>
            Every retail email we catch so you don&rsquo;t have to sort through them yourself.
          </p>
          <p style={{ marginTop: 12 }}>
            <a
              href="#suggest"
              style={{
                fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)', textDecoration: 'none',
              }}
            >
              Don&rsquo;t see a store you want? Request it here →
            </a>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="rstat-row" style={{ display: 'flex', gap: 2, marginBottom: 56 }}>
          <StatCard
            value={stats?.emails_caught ?? 0}
            label="Retail Emails Caught"
            sub="Total promotional emails ingested from subscribed retailers"
          />
          <StatCard
            value={stats?.editions_sent ?? 0}
            label="Dossier Editions Sent"
            sub="Curated briefs delivered to subscribers"
          />
          <StatCard
            value={stats?.emails_saved ?? 0}
            label="Emails You Didn't Have to Sort Through"
            sub="Retail emails caught minus editions sent"
          />
        </div>

        {/* Filters row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          flexWrap: 'wrap', marginBottom: 16,
        }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Search stores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field-input"
            style={{ maxWidth: 220, padding: '8px 14px' }}
          />

          {/* Spend tier pills */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{
              fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)',
            }}>
              Spend
            </span>
            {ALL_SPEND_TIERS.map((tier) => {
              const active = spendFilter.includes(tier)
              return (
                <button key={tier} onClick={() => toggleSpend(tier)} title={SPEND_TIER_LABELS[tier]} style={{
                  fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.08em', padding: '5px 12px', border: '1.5px solid',
                  borderColor: active ? '#0a0a0a' : 'rgba(10,10,10,0.12)',
                  background: active ? '#0a0a0a' : 'transparent',
                  color: active ? '#f7f6f3' : 'rgba(10,10,10,0.4)',
                  cursor: 'pointer',
                }}>
                  {tier}
                </button>
              )
            })}
          </div>

          {/* Category multi-select dropdown */}
          <div ref={catDropRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setCatDropOpen((o) => !o)}
              style={{
                fontFamily: 'var(--font-condensed)', fontSize: 10, fontWeight: 500,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                padding: '7px 14px', border: '1.5px solid',
                borderColor: selectedCats.length > 0 ? '#0a0a0a' : 'rgba(10,10,10,0.12)',
                background: selectedCats.length > 0 ? '#0a0a0a' : 'transparent',
                color: selectedCats.length > 0 ? '#f7f6f3' : 'rgba(10,10,10,0.4)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                whiteSpace: 'nowrap',
              }}
            >
              {selectedCats.length === 0
                ? 'All Categories'
                : selectedCats.length === 1
                  ? CATEGORY_LABELS[selectedCats[0] as Category] ?? selectedCats[0]
                  : `${selectedCats.length} Categories`}
              <span style={{ fontSize: 13, opacity: 0.6 }}>{catDropOpen ? '▲' : '▼'}</span>
            </button>

            {catDropOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
                background: '#f7f6f3', border: '1.5px solid rgba(10,10,10,0.12)',
                minWidth: 220, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}>
                {selectedCats.length > 0 && (
                  <button
                    onClick={() => setSelectedCats([])}
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 14px',
                      fontFamily: 'var(--font-condensed)', fontSize: 13,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      color: 'rgba(10,10,10,0.4)', background: 'none', border: 'none',
                      borderBottom: '1px solid rgba(10,10,10,0.04)', cursor: 'pointer',
                    }}
                  >
                    Clear filter
                  </button>
                )}
                {availableCategories.map((cat) => {
                  const active = selectedCats.includes(cat)
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCat(cat)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '10px 14px',
                        display: 'flex', alignItems: 'center', gap: 10,
                        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: active ? 600 : 400,
                        color: '#0a0a0a', background: active ? 'rgba(10,10,10,0.04)' : 'none',
                        border: 'none', borderBottom: '1px solid rgba(10,10,10,0.04)', cursor: 'pointer',
                      }}
                    >
                      <CategoryIcon category={cat as Category} size={16} />
                      <span>{CATEGORY_LABELS[cat as Category] ?? cat}</span>
                      {active && (
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(10,10,10,0.4)' }}>✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <span style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-condensed)', fontSize: 12, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)',
          }}>
            {visibleStores.length} store{visibleStores.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Age filter row — only shown if Sheet has age group data */}
        {availableAgeGroups.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)',
              }}>
                Clothing for people my age
              </span>
              {(['', 'Kids', 'Teens', "20's", "30's", "40's", '50+'] as const).map((age) => {
                const active = selectedAge === age
                return (
                  <button
                    key={age || 'all'}
                    onClick={() => setSelectedAge(age)}
                    style={{
                      fontFamily: 'var(--font-condensed)', fontSize: 12, fontWeight: 500,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      padding: '5px 14px', border: '1.5px solid',
                      borderColor: active ? '#0a0a0a' : 'rgba(10,10,10,0.12)',
                      background: active ? '#0a0a0a' : 'transparent',
                      color: active ? '#f7f6f3' : 'rgba(10,10,10,0.4)',
                      cursor: 'pointer',
                    }}
                  >
                    {age || 'All Ages'}
                  </button>
                )
              })}
            </div>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: 14, color: 'rgba(10,10,10,0.4)',
              lineHeight: 1.5, marginTop: 6,
            }}>
              Age suggestions are approximate — shop wherever you like!
            </p>
          </div>
        )}

        {/* Column headers */}
        <div className="rtable">
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 40px 56px 72px 80px 48px',
            gap: 16, padding: '10px 16px', borderBottom: '1px solid rgba(10,10,10,0.12)',
            minWidth: 500,
          }}>
            {['Store', 'Cat.', 'Spend', 'Deals', 'Status', isPaid ? 'Active' : '🔒'].map((h) => (
              <span key={h} style={{
                fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600,
                letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)',
              }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {visibleStores.length === 0 ? (
            <div style={{
              padding: '48px 16px', textAlign: 'center',
              fontFamily: 'var(--font-condensed)', fontSize: 11,
              letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)',
            }}>
              {search ? 'No stores match your search' : 'No stores match your current filters'}
            </div>
          ) : (
            visibleStores.map((store, i) => {
              const dealCount = dealCounts[store.name.toLowerCase()] ?? 0
              const storeEnabled = storePrefs[store.name] ?? true
              return (
                <StoreRowItem
                  key={`${store.name}-${i}`}
                  store={store}
                  isEven={i % 2 === 0}
                  dealCount={dealCount}
                  isPaid={isPaid}
                  storeEnabled={storeEnabled}
                  isToggling={togglingStore === store.name}
                  onToggle={handleToggle}
                />
              )
            })
          )}
        </div>{/* end .rtable */}

        {/* Suggest a store */}
        <div id="suggest" style={{ marginTop: 64, paddingTop: 48, borderTop: '1px solid rgba(10,10,10,0.12)' }}>
          <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: 'rgba(10,10,10,0.4)', marginBottom: 12 }}>Suggest a Store</p>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 300,
            letterSpacing: '-0.02em', marginBottom: 12,
          }}>
            Know a brand we should watch?
          </h2>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 14, color: 'rgba(10,10,10,0.4)',
            lineHeight: 1.6, maxWidth: 480, marginBottom: 32,
          }}>
            We'll subscribe to their emails and start pulling deals automatically.
          </p>

          {!isPaid ? (
            <div style={{
              padding: '24px 28px', background: 'rgba(10,10,10,0.04)',
              display: 'flex', alignItems: 'center', gap: 16, maxWidth: 480,
            }}>
              <span style={{ fontSize: 20 }}>🔒</span>
              <div>
                <p style={{
                  fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                  color: '#0a0a0a', marginBottom: 4,
                }}>
                  Paid feature
                </p>
                <p style={{
                  fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(10,10,10,0.4)',
                  lineHeight: 1.5,
                }}>
                  Upgrade to suggest stores for us to track.{' '}
                  <Link href="/upgrade" style={{ color: '#0a0a0a', textDecoration: 'underline' }}>
                    See what's included →
                  </Link>
                </p>
              </div>
            </div>
          ) : suggestDone ? (
            <div style={{
              padding: '24px 28px', background: 'rgba(10,10,10,0.04)', maxWidth: 480,
            }}>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                color: 'rgba(10,10,10,0.4)', marginBottom: 4,
              }}>Suggestion received!</p>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(10,10,10,0.4)',
              }}>
                We'll review it and add them to the watchlist if they run regular sales.
              </p>
              <button
                onClick={() => { setSuggestDone(false); setSuggestName(''); setSuggestSite(''); setSuggestNotes('') }}
                style={{
                  marginTop: 16, fontFamily: 'var(--font-condensed)', fontSize: 10,
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  background: 'none', border: 'none', color: 'rgba(10,10,10,0.4)',
                  cursor: 'pointer', textDecoration: 'underline', padding: 0,
                }}
              >
                Suggest another
              </button>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!suggestName.trim()) return
                setSuggesting(true)
                setSuggestError('')
                try {
                  const res = await fetch('/api/stores/suggest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ store_name: suggestName, website: suggestSite, notes: suggestNotes }),
                  })
                  if (res.ok) {
                    setSuggestDone(true)
                  } else {
                    const d = await res.json()
                    setSuggestError(d.error || 'Something went wrong.')
                  }
                } catch {
                  setSuggestError('Something went wrong.')
                } finally {
                  setSuggesting(false)
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}
            >
              <div>
                <label style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'rgba(10,10,10,0.4)', display: 'block', marginBottom: 6 }}>Store Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reformation"
                  value={suggestName}
                  onChange={(e) => setSuggestName(e.target.value)}
                  className="field-input"
                />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'rgba(10,10,10,0.4)', display: 'block', marginBottom: 6 }}>Website (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. reformation.com"
                  value={suggestSite}
                  onChange={(e) => setSuggestSite(e.target.value)}
                  className="field-input"
                />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'rgba(10,10,10,0.4)', display: 'block', marginBottom: 6 }}>Why should we add them? (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Great sales on basics, ships fast"
                  value={suggestNotes}
                  onChange={(e) => setSuggestNotes(e.target.value)}
                  className="field-input"
                />
              </div>
              {suggestError && (
                <p style={{
                  fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.15em',
                  textTransform: 'uppercase', color: 'oklch(50% 0.2 20)',
                }}>
                  {suggestError}
                </p>
              )}
              <button
                type="submit"
                disabled={suggesting}
                className="btn-primary"
                style={{ alignSelf: 'flex-start', padding: '10px 28px' }}
              >
                {suggesting ? 'Submitting...' : 'Submit Suggestion'}
              </button>
            </form>
          )}
        </div>

        {/* Footer link */}
        <div style={{ marginTop: 48, paddingTop: 40, borderTop: '1px solid rgba(10,10,10,0.12)' }}>
          <Link href="/preferences" style={{
            fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: '#0a0a0a', textDecoration: 'underline',
          }}>
            Adjust your subscription settings
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  )
}

function StoreRowItem({
  store,
  isEven,
  dealCount,
  isPaid,
  storeEnabled,
  isToggling,
  onToggle,
}: {
  store: StoreRow
  isEven: boolean
  dealCount: number
  isPaid: boolean
  storeEnabled: boolean
  isToggling: boolean
  onToggle: (retailer: string, enabled: boolean) => void
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 40px 56px 72px 80px 48px',
      gap: 16, padding: '14px 16px',
      background: isEven ? 'transparent' : 'rgba(10,10,10,0.04)',
      alignItems: 'center',
      borderBottom: '1px solid rgba(10,10,10,0.04)',
      minWidth: 500,
      opacity: isPaid && !storeEnabled ? 0.5 : 1,
      transition: 'opacity 0.2s',
    }}>
      {/* Name + NEW badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {store.website ? (
          <a
            href={store.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
              color: '#0a0a0a', textDecoration: 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {store.name}
          </a>
        ) : (
          <span style={{
            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: '#0a0a0a',
          }}>
            {store.name}
          </span>
        )}
        {store.isNew && (
          <span style={{
            fontFamily: 'var(--font-condensed)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            background: 'var(--accent)', color: '#f7f6f3',
            padding: '2px 6px', flexShrink: 0,
          }}>
            New
          </span>
        )}
      </div>

      {/* Category icon */}
      <span title={CATEGORY_LABELS[store.appCategory as Category] ?? store.category}>
        <CategoryIcon category={store.appCategory as Category} size={16} />
      </span>

      {/* Spend tier */}
      <span style={{
        fontFamily: 'var(--font-condensed)', fontSize: 13, fontWeight: 600,
        letterSpacing: '0.06em', color: '#0a0a0a',
      }}>
        {store.spendTier}
      </span>

      {/* Deal count */}
      <span
        title={dealCount > 0 ? `${dealCount} deal${dealCount !== 1 ? 's' : ''} shared` : 'No deals yet'}
        style={{
          fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: '0.08em',
          color: dealCount > 0 ? '#0a0a0a' : 'rgba(10,10,10,0.12)',
          fontWeight: dealCount > 0 ? 600 : 400,
        }}
      >
        {dealCount > 0 ? `${dealCount}` : '—'}
      </span>

      {/* Status */}
      <span style={{
        fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: store.status === 'Live' ? 'var(--accent)' : 'rgba(10,10,10,0.4)',
      }}>
        {store.status || '—'}
      </span>

      {/* Toggle */}
      <div style={{ opacity: isToggling ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        <ToggleSwitch
          enabled={storeEnabled}
          locked={!isPaid}
          onChange={(val) => onToggle(store.name, val)}
        />
      </div>
    </div>
  )
}
