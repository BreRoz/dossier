'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { DossierLogo } from '@/components/DossierLogo'
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
      padding: '32px 40px', background: 'var(--ink-06)',
      display: 'flex', flexDirection: 'column', gap: 8, flex: 1,
    }}>
      <div style={{
        fontFamily: 'var(--font-serif)', fontSize: 52, fontWeight: 300,
        letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--ink)',
      }}>
        {fmt(value)}
      </div>
      <div style={{
        fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600,
        letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent)',
      }}>
        {label}
      </div>
      {sub && (
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 13,
          color: 'var(--ink-40)', lineHeight: 1.4,
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

export default function StoresPage() {
  const supabase = createClient()
  const catDropRef = useRef<HTMLDivElement>(null)

  const [stats, setStats]             = useState<Stats | null>(null)
  const [stores, setStores]           = useState<StoreRow[]>([])
  const [spendFilter, setSpendFilter] = useState<SpendTier[]>(['$', '$$', '$$$', '$$$$'])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]             = useState('')
  const [catDropOpen, setCatDropOpen]   = useState(false)
  const [selectedCats, setSelectedCats] = useState<string[]>([])

  // Close dropdown on outside click
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

      setLoading(false)
    }
    load()
  }, [])

  // Unique app categories present in the store list
  const availableCategories = useMemo(() => {
    const seen = new Set<string>()
    for (const s of stores) if (s.appCategory) seen.add(s.appCategory)
    return Array.from(seen).sort()
  }, [stores])

  const visibleStores = useMemo(() => {
    return stores.filter((s) => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
      if (!spendFilter.includes(s.spendTier as SpendTier)) return false
      if (selectedCats.length > 0 && !selectedCats.includes(s.appCategory)) return false
      return true
    })
  }, [stores, search, spendFilter, selectedCats])

  const toggleCat = (cat: string) => {
    setSelectedCats((cur) =>
      cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat]
    )
  }

  const toggleSpend = (tier: SpendTier) => {
    setSpendFilter((cur) => {
      if (cur.includes(tier)) {
        if (cur.length === 1) return cur   // keep at least one
        return cur.filter((t) => t !== tier)
      }
      return [...cur, tier]
    })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="t-meta">Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {/* Nav */}
      <nav style={{
        height: 56, display: 'flex', alignItems: 'center', padding: '0 60px',
        borderBottom: 'var(--rule)', position: 'sticky', top: 0,
        background: 'var(--paper)', zIndex: 10,
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <DossierLogo size={22} wordmarkSize={18} />
        </Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/preferences" style={{
            fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: 'var(--ink-40)', textDecoration: 'none',
          }}>
            Settings
          </Link>
        </div>
      </nav>

      <div className="wrap" style={{ paddingTop: 64, paddingBottom: 120 }}>

        {/* Header */}
        <div style={{ marginBottom: 48, borderBottom: 'var(--rule)', paddingBottom: 40 }}>
          <p className="t-section" style={{ marginBottom: 12 }}>Your Account</p>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 48, fontWeight: 300,
            letterSpacing: '-0.02em', marginBottom: 12,
          }}>
            Subscribed Stores
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--ink-40)',
            maxWidth: 520, lineHeight: 1.55,
          }}>
            Every retail email we catch so you don&rsquo;t have to sort through them yourself.
          </p>
        </div>

        {/* ── Stats Cards ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 56 }}>
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

        {/* ── Filters row ──────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          flexWrap: 'wrap', marginBottom: 24,
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
              fontFamily: 'var(--font-condensed)', fontSize: 9, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'var(--ink-40)',
            }}>
              Spend
            </span>
            {ALL_SPEND_TIERS.map((tier) => {
              const active = spendFilter.includes(tier)
              return (
                <button key={tier} onClick={() => toggleSpend(tier)} title={SPEND_TIER_LABELS[tier]} style={{
                  fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.08em', padding: '5px 12px', border: '1.5px solid',
                  borderColor: active ? 'var(--ink)' : 'var(--ink-15)',
                  background: active ? 'var(--ink)' : 'transparent',
                  color: active ? 'var(--paper)' : 'var(--ink-40)',
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
                borderColor: selectedCats.length > 0 ? 'var(--ink)' : 'var(--ink-15)',
                background: selectedCats.length > 0 ? 'var(--ink)' : 'transparent',
                color: selectedCats.length > 0 ? 'var(--paper)' : 'var(--ink-40)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                whiteSpace: 'nowrap',
              }}
            >
              {selectedCats.length === 0
                ? 'All Categories'
                : selectedCats.length === 1
                  ? CATEGORY_LABELS[selectedCats[0] as Category] ?? selectedCats[0]
                  : `${selectedCats.length} Categories`}
              <span style={{ fontSize: 8, opacity: 0.6 }}>{catDropOpen ? '▲' : '▼'}</span>
            </button>

            {catDropOpen && (
              <div
                style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
                  background: 'var(--paper)', border: '1.5px solid var(--ink-15)',
                  minWidth: 220, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                }}
              >
                {/* Clear all */}
                {selectedCats.length > 0 && (
                  <button
                    onClick={() => setSelectedCats([])}
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 14px',
                      fontFamily: 'var(--font-condensed)', fontSize: 9,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      color: 'var(--accent)', background: 'none', border: 'none',
                      borderBottom: '1px solid var(--ink-06)', cursor: 'pointer',
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
                        color: 'var(--ink)', background: active ? 'var(--ink-06)' : 'none',
                        border: 'none', borderBottom: '1px solid var(--ink-06)', cursor: 'pointer',
                      }}
                    >
                      <CategoryIcon category={cat as Category} size={16} />
                      <span>{CATEGORY_LABELS[cat as Category] ?? cat}</span>
                      {active && (
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent)' }}>✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <span style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: 'var(--ink-40)',
          }}>
            {visibleStores.length} store{visibleStores.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Column headers ───────────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 40px 56px 80px 100px',
          gap: 16, padding: '10px 16px', borderBottom: 'var(--rule)',
        }}>
          {['Store', 'Cat.', 'Spend', 'Added', 'Status'].map((h) => (
            <span key={h} style={{
              fontFamily: 'var(--font-condensed)', fontSize: 9, fontWeight: 600,
              letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-40)',
            }}>
              {h}
            </span>
          ))}
        </div>

        {/* ── Rows ─────────────────────────────────────────────────── */}
        {visibleStores.length === 0 ? (
          <div style={{
            padding: '48px 16px', textAlign: 'center',
            fontFamily: 'var(--font-condensed)', fontSize: 11,
            letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-40)',
          }}>
            {search ? 'No stores match your search' : 'No stores match your current filters'}
          </div>
        ) : (
          visibleStores.map((store, i) => (
            <StoreRow key={`${store.name}-${i}`} store={store} isEven={i % 2 === 0} />
          ))
        )}

        {/* Footer link */}
        <div style={{ marginTop: 48, paddingTop: 40, borderTop: 'var(--rule)' }}>
          <Link href="/preferences" style={{
            fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: 'var(--ink)', textDecoration: 'underline',
          }}>
            Adjust your subscription settings
          </Link>
        </div>
      </div>
    </div>
  )
}

function StoreRow({ store, isEven }: { store: StoreRow; isEven: boolean }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 40px 56px 80px 100px',
      gap: 16, padding: '14px 16px',
      background: isEven ? 'transparent' : 'var(--ink-06)',
      alignItems: 'center',
      borderBottom: '1px solid var(--ink-06)',
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
              color: 'var(--ink)', textDecoration: 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {store.name}
          </a>
        ) : (
          <span style={{
            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--ink)',
          }}>
            {store.name}
          </span>
        )}
        {store.isNew && (
          <span style={{
            fontFamily: 'var(--font-condensed)', fontSize: 8, fontWeight: 700,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            background: 'var(--accent)', color: 'var(--paper)',
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
        letterSpacing: '0.06em', color: 'var(--ink)',
      }}>
        {store.spendTier}
      </span>

      {/* Month added */}
      <span style={{
        fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.1em',
        color: 'var(--ink-40)', textTransform: 'uppercase',
      }}>
        {monthAdded(store.dateAdded)}
      </span>

      {/* Status */}
      <span style={{
        fontFamily: 'var(--font-condensed)', fontSize: 9, letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: store.status === 'Live' ? 'var(--accent)' : 'var(--ink-40)',
      }}>
        {store.status || '—'}
      </span>
    </div>
  )
}
