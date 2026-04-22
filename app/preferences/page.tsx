'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { CategoryIcon } from '@/components/CategoryIcon'
import { createClient } from '@/lib/supabase/client'
import type { Category, DealType, SendDay, UserPreferences, GenderOption, SpendTier } from '@/types'
import { ALL_CATEGORIES, FREE_CATEGORIES, CATEGORY_LABELS, DEAL_TYPE_LABELS } from '@/types'
import type { RetailerSummary } from '@/app/api/retailers/route'

const ALL_DEAL_TYPES: DealType[] = [
  'percent-off', 'bogo-free', 'bogo-half', 'free-item',
  'free-shipping', 'flash-sale', 'stackable', 'loyalty', 'up-to',
]

const SEND_DAYS: { value: SendDay; label: string }[] = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
]

const GENDER_OPTIONS: { value: GenderOption; label: string }[] = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'unisex', label: 'Unisex' },
]

const SPEND_TIER_OPTIONS: { value: SpendTier; label: string; sub: string }[] = [
  { value: '$',    label: '$',    sub: 'Budget' },
  { value: '$$',   label: '$$',   sub: 'Mid-Range' },
  { value: '$$$',  label: '$$$',  sub: 'Premium' },
  { value: '$$$$', label: '$$$$', sub: 'Luxury' },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle" style={{ cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: checked ? 'var(--ink)' : 'var(--ink-15)',
        transition: 'background 0.2s',
        cursor: 'pointer',
      }} onClick={() => onChange(!checked)} />
      <div style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 16, height: 16, background: 'var(--paper)',
        transition: 'left 0.2s',
        pointerEvents: 'none',
      }} />
    </label>
  )
}

function SectionHeader({ label, tag }: { label: string; tag?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <p className="t-meta">{label}</p>
      {tag && (
        <span style={{
          fontFamily: 'var(--font-condensed)', fontSize: 9, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--ink-40)', background: 'var(--ink-06)', padding: '2px 8px',
        }}>
          {tag}
        </span>
      )}
    </div>
  )
}

export default function PreferencesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tier, setTier] = useState<'free' | 'paid'>('free')
  const [retailers, setRetailers] = useState<RetailerSummary[]>([])
  const [retailerSearch, setRetailerSearch] = useState('')

  const [prefs, setPrefs] = useState<UserPreferences>({
    zip_code: '',
    send_day: 'thursday',
    min_discount: 40,
    subscription_mode: 'category',
    gender_filter: ['men', 'women', 'unisex'],
    spend_tier_filter: ['$', '$$', '$$$', '$$$$'] as SpendTier[],
    categories: Object.fromEntries(ALL_CATEGORIES.map((c) => [c, FREE_CATEGORIES.includes(c)])) as Record<Category, boolean>,
    deal_types: Object.fromEntries(ALL_DEAL_TYPES.map((t) => [t, t !== 'up-to'])) as Record<DealType, boolean>,
    selected_retailers: [],
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [prefsRes, retailersRes] = await Promise.all([
        fetch('/api/preferences'),
        fetch('/api/retailers'),
      ])

      if (prefsRes.ok) {
        const data = await prefsRes.json()
        setTier(data.tier || 'free')
        setPrefs((prev) => ({
          ...prev,
          ...data.preferences,
          subscription_mode: data.preferences?.subscription_mode ?? 'category',
          gender_filter: data.preferences?.gender_filter ?? ['men', 'women', 'unisex'],
          spend_tier_filter: data.preferences?.spend_tier_filter ?? ['$', '$$', '$$$', '$$$$'],
          selected_retailers: data.preferences?.selected_retailers ?? [],
        }))
      }

      if (retailersRes.ok) {
        const data = await retailersRes.json()
        setRetailers(data.retailers || [])
      }

      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs }),
      })
      if (res.ok) setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const toggleCategory = (cat: Category) => {
    if (tier === 'free' && !FREE_CATEGORIES.includes(cat)) return
    setPrefs((p) => ({ ...p, categories: { ...p.categories, [cat]: !p.categories[cat] } }))
  }

  const toggleDealType = (dt: DealType) => {
    if (tier === 'free') return
    setPrefs((p) => ({ ...p, deal_types: { ...p.deal_types, [dt]: !p.deal_types[dt] } }))
  }

  const toggleSpendTier = (tier: SpendTier) => {
    setPrefs((p) => {
      const current = p.spend_tier_filter ?? ['$', '$$', '$$$', '$$$$']
      const has = current.includes(tier)
      if (has && current.length === 1) return p   // keep at least one
      return {
        ...p,
        spend_tier_filter: has ? current.filter((t) => t !== tier) : [...current, tier],
      }
    })
  }

  const toggleGender = (g: GenderOption) => {
    setPrefs((p) => {
      const current = p.gender_filter ?? ['men', 'women', 'unisex']
      const has = current.includes(g)
      // Keep at least one selected
      if (has && current.length === 1) return p
      return {
        ...p,
        gender_filter: has ? current.filter((x) => x !== g) : [...current, g],
      }
    })
  }

  const toggleRetailer = (name: string) => {
    if (tier === 'free') return
    setPrefs((p) => {
      const cur = p.selected_retailers ?? []
      const has = cur.includes(name)
      return { ...p, selected_retailers: has ? cur.filter((r) => r !== name) : [...cur, name] }
    })
  }

  const filteredRetailers = useMemo(
    () =>
      retailers.filter((r) =>
        retailerSearch ? r.name.toLowerCase().includes(retailerSearch.toLowerCase()) : true
      ),
    [retailers, retailerSearch]
  )

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="t-meta">Loading...</p>
      </div>
    )
  }

  const subscriptionMode = prefs.subscription_mode ?? 'category'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <Nav />

      {/* Save action bar */}
      <div style={{
        position: 'sticky', top: 56, zIndex: 9, background: 'var(--paper)',
        borderBottom: 'var(--rule)', height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '0 60px', gap: 16,
      }}>
        {saved && (
          <span style={{
            fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: 'var(--accent)',
          }}>
            Saved
          </span>
        )}
        <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ padding: '8px 24px' }}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      <div className="wrap" style={{ paddingTop: 64, paddingBottom: 120 }}>
        {/* Header */}
        <div style={{ marginBottom: 64, borderBottom: 'var(--rule)', paddingBottom: 48 }}>
          <p className="t-section" style={{ marginBottom: 12 }}>Your Account</p>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 48, fontWeight: 300,
            letterSpacing: '-0.02em', marginBottom: 16,
          }}>
            Preferences
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{
              fontFamily: 'var(--font-condensed)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              background: tier === 'paid' ? 'var(--accent)' : 'var(--ink-06)',
              color: tier === 'paid' ? 'var(--paper)' : 'var(--ink-40)',
              padding: '4px 10px',
            }}>
              {tier === 'paid' ? 'Paid' : 'Free Tier'}
            </span>
            {tier === 'free' && (
              <Link href="/upgrade" style={{
                fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: 'var(--ink)', textDecoration: 'underline',
              }}>
                Upgrade to unlock all features
              </Link>
            )}
          </div>
        </div>

        {/* ── SECTION 1: Subscription Mode (paid only) ─────────────── */}
        {tier === 'paid' && (
          <div style={{ marginBottom: 56, paddingBottom: 56, borderBottom: 'var(--rule)' }}>
            <SectionHeader label="Subscribe By" />
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-40)',
              lineHeight: 1.5, marginBottom: 20, maxWidth: 480,
            }}>
              Choose whether to receive deals by category or by individual retailers you select.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['category', 'retailer'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPrefs((p) => ({ ...p, subscription_mode: mode }))}
                  style={{
                    fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 500,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    padding: '10px 28px', border: '1.5px solid',
                    borderColor: subscriptionMode === mode ? 'var(--ink)' : 'var(--ink-15)',
                    background: subscriptionMode === mode ? 'var(--ink)' : 'transparent',
                    color: subscriptionMode === mode ? 'var(--paper)' : 'var(--ink-40)',
                    cursor: 'pointer',
                  }}
                >
                  {mode === 'category' ? 'Category' : 'Individual Retailers'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION 2: Category OR Retailer Selector ─────────────── */}
        <div style={{ marginBottom: 56, paddingBottom: 56, borderBottom: 'var(--rule)' }}>
          {subscriptionMode === 'retailer' && tier === 'paid' ? (
            <>
              <SectionHeader label="Retailers" />
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-40)',
                lineHeight: 1.5, marginBottom: 20, maxWidth: 480,
              }}>
                Select the specific retailers you want to receive deals from.{' '}
                <span style={{ color: 'var(--ink)' }}>
                  {(prefs.selected_retailers ?? []).length} selected
                </span>
              </p>

              {/* Search */}
              <input
                type="text"
                placeholder="Search retailers..."
                value={retailerSearch}
                onChange={(e) => setRetailerSearch(e.target.value)}
                className="field-input"
                style={{ maxWidth: 320, marginBottom: 16 }}
              />

              {/* Retailer list */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 2,
                maxHeight: 480, overflowY: 'auto',
              }}>
                {filteredRetailers.length === 0 ? (
                  <p style={{
                    fontFamily: 'var(--font-condensed)', fontSize: 11,
                    letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-40)',
                    padding: '16px 0',
                  }}>
                    No retailers found
                  </p>
                ) : (
                  filteredRetailers.map((r) => {
                    const isSelected = (prefs.selected_retailers ?? []).includes(r.name)
                    return (
                      <div
                        key={r.name}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 16px', background: 'var(--ink-06)',
                          cursor: 'pointer',
                        }}
                        onClick={() => toggleRetailer(r.name)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Checkbox indicator */}
                          <div style={{
                            width: 18, height: 18, border: '1.5px solid',
                            borderColor: isSelected ? 'var(--ink)' : 'var(--ink-15)',
                            background: isSelected ? 'var(--ink)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {isSelected && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L4 7L9 1" stroke="var(--paper)" strokeWidth="1.5" strokeLinecap="square"/>
                              </svg>
                            )}
                          </div>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600 }}>
                            {r.name}
                          </span>
                        </div>
                        {r.potential_savings !== null && (
                          <span style={{
                            fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: '0.12em',
                            color: 'var(--ink-40)',
                          }}>
                            Up to {r.potential_savings}% off
                          </span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </>
          ) : (
            // Category mode (default for free + paid when mode = 'category')
            <>
              <SectionHeader
                label="Categories"
                tag={tier === 'free' ? undefined : undefined}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {ALL_CATEGORIES.map((cat) => {
                  const locked = tier === 'free' && !FREE_CATEGORIES.includes(cat)
                  return (
                    <div
                      key={cat}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', background: locked ? 'transparent' : 'var(--ink-06)',
                        opacity: locked ? 0.4 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <CategoryIcon category={cat} size={18} />
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600 }}>
                          {CATEGORY_LABELS[cat]}
                        </span>
                        {locked && (
                          <span style={{
                            fontFamily: 'var(--font-condensed)', fontSize: 9,
                            letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-40)',
                          }}>
                            Paid
                          </span>
                        )}
                      </div>
                      <Toggle checked={prefs.categories[cat]} onChange={() => toggleCategory(cat)} />
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* ── SECTION 3: Gender Filter (all users) ─────────────────── */}
        <div style={{ marginBottom: 56, paddingBottom: 56, borderBottom: 'var(--rule)' }}>
          <SectionHeader label="Gender" />
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-40)',
            lineHeight: 1.5, marginBottom: 20, maxWidth: 480,
          }}>
            Only show deals relevant to the genders you shop for. Select all that apply.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {GENDER_OPTIONS.map(({ value, label }) => {
              const active = (prefs.gender_filter ?? ['men', 'women', 'unisex']).includes(value)
              return (
                <button
                  key={value}
                  onClick={() => toggleGender(value)}
                  style={{
                    fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 500,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    padding: '10px 28px', border: '1.5px solid',
                    borderColor: active ? 'var(--ink)' : 'var(--ink-15)',
                    background: active ? 'var(--ink)' : 'transparent',
                    color: active ? 'var(--paper)' : 'var(--ink-40)',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── SECTION 4: Spend Tier Filter (all users) ─────────────── */}
        <div style={{ marginBottom: 56, paddingBottom: 56, borderBottom: 'var(--rule)' }}>
          <SectionHeader label="Spend Tier" />
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink-40)',
            lineHeight: 1.5, marginBottom: 20, maxWidth: 480,
          }}>
            Filter deals by how much brands typically charge. Select all tiers you shop.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {SPEND_TIER_OPTIONS.map(({ value, label, sub }) => {
              const active = (prefs.spend_tier_filter ?? ['$', '$$', '$$$', '$$$$']).includes(value)
              return (
                <button
                  key={value}
                  onClick={() => toggleSpendTier(value)}
                  title={sub}
                  style={{
                    fontFamily: 'var(--font-condensed)', fontSize: 13, fontWeight: 600,
                    letterSpacing: '0.1em', padding: '10px 20px', border: '1.5px solid',
                    borderColor: active ? 'var(--ink)' : 'var(--ink-15)',
                    background: active ? 'var(--ink)' : 'transparent',
                    color: active ? 'var(--paper)' : 'var(--ink-40)',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}
                >
                  <span>{label}</span>
                  <span style={{ fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.7 }}>{sub}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Delivery Settings ────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, marginBottom: 56, paddingBottom: 56, borderBottom: 'var(--rule)' }}>
          {/* Left: Zip + Send Day + Min Discount */}
          <div>
            {/* Zip code */}
            <div style={{ marginBottom: 48, paddingBottom: 48, borderBottom: 'var(--rule)' }}>
              <SectionHeader label="Zip Code" />
              <input
                type="text"
                placeholder="10001"
                value={prefs.zip_code || ''}
                onChange={(e) => setPrefs((p) => ({ ...p, zip_code: e.target.value }))}
                className="field-input"
                style={{ maxWidth: 200 }}
              />
            </div>

            {/* Send day */}
            <div style={{ marginBottom: 48, paddingBottom: 48, borderBottom: 'var(--rule)' }}>
              <SectionHeader label="Send Day" tag={tier === 'free' ? 'Paid Only' : undefined} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SEND_DAYS.map(({ value, label }) => (
                  <button
                    key={value}
                    disabled={tier === 'free' && value !== 'thursday'}
                    onClick={() => tier === 'paid' && setPrefs((p) => ({ ...p, send_day: value }))}
                    style={{
                      fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 500,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      padding: '8px 16px', border: '1.5px solid',
                      borderColor: prefs.send_day === value ? 'var(--ink)' : 'var(--ink-15)',
                      background: prefs.send_day === value ? 'var(--ink)' : 'transparent',
                      color: prefs.send_day === value ? 'var(--paper)' : tier === 'free' && value !== 'thursday' ? 'var(--ink-15)' : 'var(--ink-40)',
                      cursor: tier === 'free' ? 'default' : 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Minimum discount */}
            <div>
              <SectionHeader label="Minimum Discount" tag={tier === 'free' ? 'Paid Only' : undefined} />
              <div style={{ display: 'flex', gap: 8 }}>
                {[30, 40, 50].map((v) => (
                  <button
                    key={v}
                    disabled={tier === 'free' && v !== 40}
                    onClick={() => tier === 'paid' && setPrefs((p) => ({ ...p, min_discount: v as 30 | 40 | 50 }))}
                    style={{
                      fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 500,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      padding: '8px 20px', border: '1.5px solid',
                      borderColor: prefs.min_discount === v ? 'var(--ink)' : 'var(--ink-15)',
                      background: prefs.min_discount === v ? 'var(--ink)' : 'transparent',
                      color: prefs.min_discount === v ? 'var(--paper)' : tier === 'free' && v !== 40 ? 'var(--ink-15)' : 'var(--ink-40)',
                      cursor: tier === 'free' ? 'default' : 'pointer',
                    }}
                  >
                    {v}%+
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Deal Types */}
          <div>
            <SectionHeader label="Deal Types" tag={tier === 'free' ? 'Paid Only' : undefined} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {ALL_DEAL_TYPES.map((dt) => (
                <div
                  key={dt}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', background: 'var(--ink-06)',
                    opacity: tier === 'free' ? 0.4 : 1,
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600 }}>
                    {DEAL_TYPE_LABELS[dt]}
                  </span>
                  <Toggle checked={prefs.deal_types[dt]} onChange={() => toggleDealType(dt)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Save button bottom */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, alignItems: 'center' }}>
          <Link
            href="/stores"
            style={{
              fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: 'var(--ink-40)', textDecoration: 'none',
            }}
          >
            View Subscribed Stores →
          </Link>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}
