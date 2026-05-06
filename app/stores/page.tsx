'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { Reveal } from '@/components/Reveal'
import { FlapNumber } from '@/components/FlapNumber'
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
  '$': 'Budget',
  '$$': 'Mid-Range',
  '$$$': 'Premium',
  '$$$$': 'Luxury',
}
const AGE_GROUPS = ['', 'Kids', 'Teens', "20's", "30's", "40's", '50+'] as const

// ── Architectural square toggle with lock-icon for free users ──────────
function ToggleSwitch({
  enabled,
  locked,
  onChange,
}: {
  enabled: boolean
  locked: boolean
  onChange?: (val: boolean) => void
}) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => (locked ? router.push('/pricing') : onChange?.(!enabled))}
      title={
        locked
          ? 'Paid only — click to subscribe'
          : enabled
          ? 'Receiving deals — click to mute'
          : 'Muted — click to unmute'
      }
      className={`dd-toggle ${enabled && !locked ? 'on' : ''} ${locked ? 'locked' : ''}`}
      aria-label={locked ? 'Locked — click to upgrade' : enabled ? 'Mute store' : 'Unmute store'}
    >
      <span className="thumb">{locked ? '🔒' : ''}</span>
    </button>
  )
}

export default function StoresPage() {
  const catDropRef = useRef<HTMLDivElement>(null)
  const ageDropRef = useRef<HTMLDivElement>(null)

  const [stats, setStats] = useState<Stats | null>(null)
  const [stores, setStores] = useState<StoreRow[]>([])
  const [spendFilter, setSpendFilter] = useState<SpendTier[]>(['$', '$$', '$$$', '$$$$'])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catDropOpen, setCatDropOpen] = useState(false)
  const [ageDropOpen, setAgeDropOpen] = useState(false)
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [selectedAge, setSelectedAge] = useState<string>('')
  const [dealCounts, setDealCounts] = useState<Record<string, number>>({})
  const [isPaid, setIsPaid] = useState(false)
  const [storePrefs, setStorePrefs] = useState<Record<string, boolean>>({})
  const [togglingStore, setTogglingStore] = useState<string | null>(null)
  const [suggestName, setSuggestName] = useState('')
  const [suggestSite, setSuggestSite] = useState('')
  const [suggestNotes, setSuggestNotes] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const [suggestDone, setSuggestDone] = useState(false)
  const [suggestError, setSuggestError] = useState('')

  // Outside-click closes both dropdowns
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (catDropRef.current && !catDropRef.current.contains(e.target as Node)) {
        setCatDropOpen(false)
      }
      if (ageDropRef.current && !ageDropRef.current.contains(e.target as Node)) {
        setAgeDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Load auth, prefs, stats, stores, deal counts
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }

      const [statsRes, storesRes, prefsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/stores'),
        fetch('/api/preferences'),
      ])

      if (statsRes.ok) setStats(await statsRes.json())

      if (storesRes.ok) {
        const data = await storesRes.json()
        setStores(data.stores || [])
      }

      if (prefsRes.ok) {
        const data = await prefsRes.json()
        const prefs = data.preferences || {}
        if (prefs.spend_tier_filter?.length) setSpendFilter(prefs.spend_tier_filter)
      }

      // Subscriber tier + per-store preferences (paid only)
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

      // All-time deal counts per retailer (lowercased)
      const { data: deals } = await supabase.from('deals').select('retailer')

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

  const handleToggle = useCallback(
    async (retailer: string, enabled: boolean) => {
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
        setStorePrefs((prev) => ({ ...prev, [retailer]: !enabled }))
      } finally {
        setTogglingStore(null)
      }
    },
    [isPaid]
  )

  const availableCategories = useMemo(() => {
    const seen = new Set<string>()
    for (const s of stores) if (s.appCategory) seen.add(s.appCategory)
    return Array.from(seen).sort()
  }, [stores])

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

  const catLabel =
    selectedCats.length === 0
      ? 'All Categories'
      : selectedCats.length === 1
      ? CATEGORY_LABELS[selectedCats[0] as Category] ?? selectedCats[0]
      : `${selectedCats.length} Categories`

  if (loading) {
    return (
      <>
        <Nav />
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p className="t-meta" style={{ color: 'var(--ink-40)' }}>
            Loading…
          </p>
        </div>
      </>
    )
  }

  const confirmedCount = stores.filter((s) => s.status === 'Confirmed').length

  return (
    <>
      <Nav />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(56px, 8vw, 96px) 0 clamp(40px, 5vw, 64px)' }}>
        <div className="wrap">
          <Reveal>
            <div className="t-eyebrow">Your Account</div>
          </Reveal>
          <Reveal delay={100}>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 300,
                fontSize: 'clamp(48px, 7vw, 96px)',
                marginTop: 20,
                lineHeight: 1,
                letterSpacing: '-0.03em',
                maxWidth: '14ch',
              }}
            >
              Subscribed{' '}
              <em style={{ color: 'var(--olive-deep)', fontWeight: 300 }}>Stores</em>
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
              Every retail email we catch so you don&rsquo;t have to sort through them yourself.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <a
              href="#suggest"
              className="t-meta"
              style={{
                marginTop: 16,
                display: 'inline-block',
                color: 'var(--ink-40)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--ink-15)',
                paddingBottom: 2,
              }}
            >
              Don&rsquo;t see a store you want? Request it →
            </a>
          </Reveal>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section style={{ paddingBottom: 'clamp(48px, 6vw, 80px)' }}>
        <div className="wrap">
          <div
            className="grid-3"
            style={{ gap: 1, background: 'var(--ink-15)' }}
          >
            {[
              [stats?.emails_caught ?? 0, 'Retail Emails Caught', 'Total promotional emails ingested'],
              [stats?.editions_sent ?? 0, 'Dossier Editions Sent', 'Curated briefs delivered'],
              [
                stats?.emails_saved ?? 0,
                "Emails You Didn't Sort",
                'Caught minus delivered — your inbox time saved',
              ],
            ].map(([n, label, sub], i) => (
              <Reveal key={String(label)} delay={i * 80}>
                <div style={{ background: 'var(--paper)', padding: 32, height: '100%' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 64,
                      lineHeight: 1,
                      fontStyle: 'italic',
                      fontWeight: 300,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    <FlapNumber value={String(n)} />
                  </div>
                  <div className="t-meta" style={{ marginTop: 16, color: 'var(--ink-55)' }}>
                    {label}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-55)', lineHeight: 1.5 }}>
                    {sub}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FILTERS + TABLE ──────────────────────────────────────────────── */}
      <section style={{ paddingBottom: 'clamp(56px, 8vw, 96px)' }}>
        <div className="wrap">
          {/* Filter row */}
          <div
            className="rfilter"
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: 32,
            }}
          >
            <div className="field" style={{ flex: 1, minWidth: 240, maxWidth: 320 }}>
              <input
                type="text"
                placeholder="Search stores..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Spend pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="t-meta" style={{ color: 'var(--ink-40)' }}>
                Spend
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {ALL_SPEND_TIERS.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => toggleSpend(tier)}
                    title={SPEND_TIER_LABELS[tier]}
                    className={`pill ${spendFilter.includes(tier) ? 'on' : ''}`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            {/* Category multi-select */}
            <div ref={catDropRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="filter-btn"
                onClick={() => {
                  setCatDropOpen((o) => !o)
                  setAgeDropOpen(false)
                }}
              >
                {catLabel}
                <span style={{ marginLeft: 8, opacity: 0.5 }}>▾</span>
              </button>
              {catDropOpen && (
                <div className="filter-menu">
                  {selectedCats.length > 0 && (
                    <button
                      type="button"
                      className="filter-clear"
                      onClick={() => setSelectedCats([])}
                    >
                      Clear filter
                    </button>
                  )}
                  {availableCategories.map((cat) => (
                    <label key={cat} className="filter-row">
                      <input
                        type="checkbox"
                        checked={selectedCats.includes(cat)}
                        onChange={() => toggleCat(cat)}
                      />
                      <CategoryIcon category={cat as Category} size={14} />
                      <span>{CATEGORY_LABELS[cat as Category] ?? cat}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Age single-select (only shown if data has age groups) */}
            {availableAgeGroups.length > 0 && (
              <div ref={ageDropRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => {
                    setAgeDropOpen((o) => !o)
                    setCatDropOpen(false)
                  }}
                >
                  {selectedAge || 'All Ages'}
                  <span style={{ marginLeft: 8, opacity: 0.5 }}>▾</span>
                </button>
                {ageDropOpen && (
                  <div className="filter-menu">
                    {AGE_GROUPS.map((age) => {
                      const active = selectedAge === age
                      return (
                        <button
                          key={age || 'all'}
                          type="button"
                          className={`filter-row btn-row ${active ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedAge(age)
                            setAgeDropOpen(false)
                          }}
                        >
                          <span>{age || 'All Ages'}</span>
                          {active && <span style={{ color: 'var(--olive-deep)' }}>●</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <span
              className="t-meta"
              style={{ color: 'var(--ink-40)', marginLeft: 'auto' }}
            >
              {visibleStores.length} of {stores.length} · {confirmedCount} confirmed
            </span>
          </div>

          {/* Table */}
          <div className="rtable" style={{ borderTop: '1px solid var(--ink)' }}>
            <div
              className="stores-header"
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 0.7fr 0.7fr 1fr 0.6fr',
                gap: 16,
                padding: '16px 0',
                borderBottom: '1px solid var(--ink-15)',
                minWidth: 540,
              }}
            >
              {['Store', 'Category', 'Spend', 'Deals', 'Status', isPaid ? 'Active' : '🔒'].map((h) => (
                <div key={h} className="t-meta" style={{ color: 'var(--ink-40)' }}>
                  {h}
                </div>
              ))}
            </div>

            {visibleStores.length === 0 ? (
              <div
                style={{
                  padding: '64px 0',
                  textAlign: 'center',
                  color: 'var(--ink-40)',
                  fontFamily: 'var(--font-condensed)',
                  fontSize: 12,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                {search ? 'No stores match your search' : 'No stores match your current filters'}
              </div>
            ) : (
              visibleStores.map((store, i) => {
                const dealCount = dealCounts[store.name.toLowerCase()] ?? 0
                const storeEnabled = storePrefs[store.name] ?? true
                return (
                  <Reveal key={`${store.name}-${i}`} delay={Math.min(i, 12) * 30}>
                    <div
                      className="store-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 0.7fr 0.7fr 1fr 0.6fr',
                        gap: 16,
                        padding: '20px 0',
                        borderBottom: '1px solid var(--ink-08)',
                        alignItems: 'center',
                        opacity: isPaid && !storeEnabled ? 0.5 : 1,
                        transition: 'opacity 0.2s, background .3s var(--easing)',
                        minWidth: 540,
                      }}
                    >
                      {/* Name + NEW badge */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          minWidth: 0,
                        }}
                      >
                        {store.website ? (
                          <a
                            href={store.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: 20,
                              fontWeight: 350,
                              letterSpacing: '-0.01em',
                              color: 'var(--ink)',
                              textDecoration: 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {store.name}
                          </a>
                        ) : (
                          <span
                            style={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: 20,
                              fontWeight: 350,
                              letterSpacing: '-0.01em',
                              color: 'var(--ink)',
                            }}
                          >
                            {store.name}
                          </span>
                        )}
                        {store.isNew && (
                          <span
                            className="t-meta"
                            style={{ color: 'var(--olive-deep)', fontSize: 9 }}
                          >
                            New
                          </span>
                        )}
                      </div>

                      {/* Category */}
                      <div
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: 14,
                          color: 'var(--ink-70)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <CategoryIcon category={store.appCategory as Category} size={14} />
                        <span>
                          {CATEGORY_LABELS[store.appCategory as Category] ?? store.category}
                        </span>
                      </div>

                      {/* Spend tier */}
                      <div className="t-mono" style={{ color: 'var(--ink-55)' }}>
                        {store.spendTier}
                      </div>

                      {/* Deal count */}
                      <div
                        className="t-mono"
                        title={
                          dealCount > 0
                            ? `${dealCount} deal${dealCount !== 1 ? 's' : ''} shared`
                            : 'No deals yet'
                        }
                        style={{
                          color: dealCount > 0 ? 'var(--ink)' : 'var(--ink-25)',
                          fontWeight: dealCount > 0 ? 600 : 400,
                        }}
                      >
                        {dealCount > 0 ? dealCount : '—'}
                      </div>

                      {/* Status */}
                      <div
                        className="t-meta"
                        style={{
                          color:
                            store.status === 'Confirmed'
                              ? 'var(--olive-deep)'
                              : 'var(--ink-40)',
                        }}
                      >
                        {store.status === 'Confirmed' ? '● ' : ''}
                        {store.status || '—'}
                      </div>

                      {/* Toggle */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          opacity: togglingStore === store.name ? 0.5 : 1,
                          transition: 'opacity 0.2s',
                        }}
                      >
                        <ToggleSwitch
                          enabled={storeEnabled}
                          locked={!isPaid}
                          onChange={(val) => handleToggle(store.name, val)}
                        />
                      </div>
                    </div>
                  </Reveal>
                )
              })
            )}
          </div>
        </div>
      </section>

      {/* ── SUGGEST A STORE ──────────────────────────────────────────────── */}
      <section
        id="suggest"
        style={{
          paddingTop: 'clamp(48px, 6vw, 80px)',
          paddingBottom: 'clamp(56px, 8vw, 96px)',
          borderTop: '1px solid var(--ink-15)',
        }}
      >
        <div className="wrap">
          <Reveal>
            <div className="t-eyebrow">Suggest a Store</div>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(36px, 4.5vw, 56px)',
                fontWeight: 300,
                letterSpacing: '-0.02em',
                lineHeight: 1.05,
                marginTop: 16,
                maxWidth: '18ch',
              }}
            >
              Know a brand we should{' '}
              <em style={{ color: 'var(--olive-deep)' }}>watch?</em>
            </h2>
            <p
              style={{
                marginTop: 20,
                color: 'var(--ink-70)',
                maxWidth: '46ch',
                fontSize: 16,
                lineHeight: 1.6,
              }}
            >
              We&rsquo;ll subscribe to their emails and start pulling deals automatically.
            </p>
          </Reveal>

          {!isPaid ? (
            <div className="card" style={{ marginTop: 32, maxWidth: 560 }}>
              <div className="t-meta" style={{ color: 'var(--olive-deep)' }}>
                🔒 Paid Feature
              </div>
              <p style={{ marginTop: 16, fontSize: 15, color: 'var(--ink-70)', lineHeight: 1.6 }}>
                Upgrade to suggest stores for us to track.{' '}
                <Link
                  href="/pricing"
                  style={{
                    color: 'var(--ink)',
                    borderBottom: '1px solid currentColor',
                    textDecoration: 'none',
                  }}
                >
                  See what&rsquo;s included →
                </Link>
              </p>
            </div>
          ) : suggestDone ? (
            <div className="card" style={{ marginTop: 32, maxWidth: 560 }}>
              <div className="t-meta" style={{ color: 'var(--olive-deep)' }}>
                ✓ Suggestion received
              </div>
              <p style={{ marginTop: 16, fontSize: 15, color: 'var(--ink-70)', lineHeight: 1.6 }}>
                We&rsquo;ll review it and add them to the watchlist if they run regular sales.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSuggestDone(false)
                  setSuggestName('')
                  setSuggestSite('')
                  setSuggestNotes('')
                }}
                className="t-meta"
                style={{
                  marginTop: 16,
                  background: 'none',
                  border: 'none',
                  color: 'var(--ink-40)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
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
                    body: JSON.stringify({
                      store_name: suggestName,
                      website: suggestSite,
                      notes: suggestNotes,
                    }),
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
              style={{
                marginTop: 32,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                maxWidth: 560,
              }}
            >
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="t-meta" style={{ color: 'var(--ink-40)' }}>
                  Store Name *
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reformation"
                  value={suggestName}
                  onChange={(e) => setSuggestName(e.target.value)}
                  className="field-input"
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="t-meta" style={{ color: 'var(--ink-40)' }}>
                  Website (optional)
                </span>
                <input
                  type="text"
                  placeholder="reformation.com"
                  value={suggestSite}
                  onChange={(e) => setSuggestSite(e.target.value)}
                  className="field-input"
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="t-meta" style={{ color: 'var(--ink-40)' }}>
                  Why should we add them? (optional)
                </span>
                <input
                  type="text"
                  placeholder="Great sales on basics, ships fast"
                  value={suggestNotes}
                  onChange={(e) => setSuggestNotes(e.target.value)}
                  className="field-input"
                />
              </label>
              {suggestError && (
                <p
                  className="t-meta"
                  style={{ color: 'oklch(50% 0.2 20)' }}
                >
                  {suggestError}
                </p>
              )}
              <button
                type="submit"
                disabled={suggesting}
                className="btn-primary"
                style={{ alignSelf: 'flex-start' }}
              >
                {suggesting ? 'Submitting…' : (
                  <>
                    Submit Suggestion <span className="arr">→</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div
            style={{
              marginTop: 64,
              paddingTop: 32,
              borderTop: '1px solid var(--ink-15)',
            }}
          >
            <Link
              href="/preferences"
              className="t-meta"
              style={{
                color: 'var(--ink)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--ink-15)',
                paddingBottom: 2,
              }}
            >
              Adjust your subscription settings →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
