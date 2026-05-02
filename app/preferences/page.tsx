'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { Reveal } from '@/components/Reveal'
import { CategoryIcon } from '@/components/CategoryIcon'
import { createClient } from '@/lib/supabase/client'
import type {
  Category,
  DealType,
  SendDay,
  UserPreferences,
  GenderOption,
  SpendTier,
} from '@/types'
import { ALL_CATEGORIES, FREE_CATEGORIES, CATEGORY_LABELS, DEAL_TYPE_LABELS } from '@/types'
import type { StoreRow } from '@/app/api/stores/route'

const ALL_DEAL_TYPES: DealType[] = [
  'percent-off', 'bogo-free', 'bogo-half', 'free-item',
  'free-shipping', 'flash-sale', 'stackable', 'loyalty', 'up-to',
]

const SEND_DAYS: { value: SendDay; label: string }[] = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
]

const GENDER_OPTIONS: { value: GenderOption; label: string }[] = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'unisex', label: 'Unisex' },
]

const SPEND_TIER_OPTIONS: SpendTier[] = ['$', '$$', '$$$', '$$$$']

// ── Square architectural toggle (matches stores page) ──────────────────
function Toggle({
  checked,
  onChange,
  locked = false,
  lockedTitle = 'Upgrade to paid to change this setting',
}: {
  checked: boolean
  onChange: (v: boolean) => void
  locked?: boolean
  lockedTitle?: string
}) {
  return (
    <button
      type="button"
      onClick={() => !locked && onChange(!checked)}
      title={locked ? lockedTitle : checked ? 'On — click to turn off' : 'Off — click to turn on'}
      className={`dd-toggle ${checked && !locked ? 'on' : ''} ${locked ? 'locked' : ''}`}
      disabled={locked}
      aria-label={checked ? 'Turn off' : 'Turn on'}
    >
      <span className="thumb">{locked ? '🔒' : ''}</span>
    </button>
  )
}

// ── Numbered section header with optional "Paid Only" tag ──────────────
function SectionLabel({
  n,
  label,
  tag,
}: {
  n: string
  label: string
  tag?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 16,
        paddingBottom: 16,
        borderBottom: '1px solid var(--ink)',
      }}
    >
      <span className="t-mono" style={{ color: 'var(--olive-deep)' }}>
        {n}
      </span>
      <span
        style={{
          fontSize: 12,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      {tag && (
        <span
          className="t-meta"
          style={{ color: 'var(--olive-deep)', marginLeft: 'auto' }}
        >
          {tag}
        </span>
      )}
    </div>
  )
}

export default function PreferencesPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [tier, setTier] = useState<'free' | 'paid'>('free')
  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [retailers, setRetailers] = useState<StoreRow[]>([])
  const [retailerSearch, setRetailerSearch] = useState('')

  const [prefs, setPrefs] = useState<UserPreferences>({
    zip_code: '',
    send_day: 'thursday',
    min_discount: 40,
    subscription_mode: 'category',
    gender_filter: ['men', 'women', 'unisex'],
    spend_tier_filter: ['$', '$$', '$$$', '$$$$'] as SpendTier[],
    categories: Object.fromEntries(
      ALL_CATEGORIES.map((c) => [c, FREE_CATEGORIES.includes(c)])
    ) as Record<Category, boolean>,
    deal_types: Object.fromEntries(
      ALL_DEAL_TYPES.map((t) => [t, t !== 'up-to'])
    ) as Record<DealType, boolean>,
    selected_retailers: [],
  })

  // ── Load prefs + retailers ────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const [prefsRes, retailersRes] = await Promise.all([
        fetch('/api/preferences'),
        fetch('/api/stores'),
      ])

      if (prefsRes.ok) {
        const data = await prefsRes.json()
        setTier(data.tier || 'free')
        setPrefs((prev) => ({
          ...prev,
          ...data.preferences,
          send_day: data.preferences?.send_day ?? 'thursday',
          min_discount: data.preferences?.min_discount ?? 40,
          subscription_mode: data.preferences?.subscription_mode ?? 'category',
          gender_filter: data.preferences?.gender_filter ?? ['men', 'women', 'unisex'],
          spend_tier_filter:
            data.preferences?.spend_tier_filter ?? ['$', '$$', '$$$', '$$$$'],
          selected_retailers: data.preferences?.selected_retailers ?? [],
        }))
      }

      if (retailersRes.ok) {
        const data = await retailersRes.json()
        setRetailers(
          (data.stores || []).filter((s: StoreRow) => s.status === 'Confirmed')
        )
      }

      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Save / change email / delete account ──────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 4000)
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveError(data.error ?? 'Save failed — please try again')
      }
    } catch {
      setSaveError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  const handleChangeEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      setEmailMsg('Please enter a valid email address.')
      return
    }
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) {
      setEmailMsg(error.message)
    } else {
      setEmailMsg(
        'Check your new email address for a confirmation link. Your email will update once confirmed.'
      )
      setNewEmail('')
      setShowChangeEmail(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm.toLowerCase() !== 'delete') return
    setDeletingAccount(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' })
      if (res.ok) {
        await createClient().auth.signOut()
        router.push('/?deleted=1')
      }
    } finally {
      setDeletingAccount(false)
    }
  }

  // ── Mutators ──────────────────────────────────────────────────────────
  const toggleCategory = (cat: Category) => {
    if (tier === 'free' && !FREE_CATEGORIES.includes(cat)) return
    setPrefs((p) => ({
      ...p,
      categories: { ...p.categories, [cat]: !p.categories[cat] },
    }))
  }

  const toggleDealType = (dt: DealType) => {
    if (tier === 'free') return
    setPrefs((p) => ({
      ...p,
      deal_types: { ...p.deal_types, [dt]: !p.deal_types[dt] },
    }))
  }

  const toggleSpendTier = (t: SpendTier) => {
    setPrefs((p) => {
      const current = p.spend_tier_filter ?? ['$', '$$', '$$$', '$$$$']
      const has = current.includes(t)
      if (has && current.length === 1) return p
      return {
        ...p,
        spend_tier_filter: has ? current.filter((x) => x !== t) : [...current, t],
      }
    })
  }

  const toggleGender = (g: GenderOption) => {
    setPrefs((p) => {
      const current = p.gender_filter ?? ['men', 'women', 'unisex']
      const has = current.includes(g)
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
      return {
        ...p,
        selected_retailers: has ? cur.filter((r) => r !== name) : [...cur, name],
      }
    })
  }

  const filteredRetailers = useMemo(
    () =>
      retailers
        .filter((r) =>
          retailerSearch
            ? r.name.toLowerCase().includes(retailerSearch.toLowerCase())
            : true
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [retailers, retailerSearch]
  )

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

  const subscriptionMode = prefs.subscription_mode ?? 'category'
  const inRetailerMode = subscriptionMode === 'retailer' && tier === 'paid'

  return (
    <>
      <Nav />

      {/* ── Sticky save bar ───────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 60,
          zIndex: 30,
          background: 'var(--paper)',
          borderBottom: '1px solid var(--ink-15)',
          padding: '14px 56px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
        className="pref-save-bar"
      >
        <div
          className="t-meta"
          style={{
            color: saved
              ? 'var(--olive-deep)'
              : saveError
              ? 'oklch(50% 0.2 20)'
              : 'var(--ink-55)',
          }}
        >
          {saved ? '✓ Saved' : saveError ? saveError : 'Unsaved changes'}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? 'Saving…' : 'Save Preferences'}
        </button>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(56px, 7vw, 96px) 0 clamp(40px, 5vw, 64px)' }}>
        <div className="wrap">
          <Reveal>
            <div className="t-eyebrow">Your Account</div>
          </Reveal>
          <Reveal delay={100}>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 300,
                fontSize: 'clamp(48px, 7vw, 88px)',
                marginTop: 20,
                lineHeight: 1,
                letterSpacing: '-0.025em',
              }}
            >
              Preferences
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <div
              style={{
                marginTop: 24,
                display: 'flex',
                gap: 16,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span className="pill on" style={{ cursor: 'default' }}>
                {tier === 'paid' ? 'Paid Tier' : 'Free Tier'}
              </span>
              {tier === 'free' && (
                <span className="t-meta" style={{ color: 'var(--ink-40)' }}>
                  Paid tier coming soon
                </span>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Subscription mode (paid only) ─────────────────────────────── */}
      {tier === 'paid' && (
        <section style={{ paddingBottom: 'clamp(40px, 5vw, 64px)' }}>
          <div className="wrap">
            <SectionLabel n="00" label="Subscribe By" />
            <p
              style={{
                marginTop: 16,
                fontSize: 14,
                color: 'var(--ink-70)',
                lineHeight: 1.55,
                maxWidth: 520,
              }}
            >
              Choose whether to receive deals by category or by individual retailers
              you select.
            </p>
            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              {(['category', 'retailer'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, subscription_mode: mode }))}
                  className={`pill ${subscriptionMode === mode ? 'on' : ''}`}
                >
                  {mode === 'category' ? 'Category' : 'Individual Retailers'}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Section grid 1: Categories | Deal Types | Send Day ────────── */}
      <section style={{ paddingBottom: 'clamp(48px, 6vw, 80px)' }}>
        <div className="wrap">
          <div className="grid-3" style={{ gap: 48 }}>
            {/* 01 — Categories or Retailer selector */}
            <Reveal>
              {inRetailerMode ? (
                <>
                  <SectionLabel n="01" label="Retailers" />
                  <p
                    style={{
                      marginTop: 16,
                      fontSize: 13,
                      color: 'var(--ink-70)',
                      lineHeight: 1.55,
                    }}
                  >
                    Select specific retailers you want deals from.{' '}
                    <span style={{ color: 'var(--ink)' }}>
                      {(prefs.selected_retailers ?? []).length} selected
                    </span>
                    .
                  </p>
                  <p style={{ marginTop: 8 }}>
                    <Link
                      href="/stores"
                      className="t-meta"
                      style={{
                        color: 'var(--ink-40)',
                        textDecoration: 'none',
                        borderBottom: '1px solid var(--ink-15)',
                        paddingBottom: 2,
                      }}
                    >
                      View all stores →
                    </Link>
                  </p>
                  <input
                    type="text"
                    placeholder="Search retailers..."
                    value={retailerSearch}
                    onChange={(e) => setRetailerSearch(e.target.value)}
                    className="field-input"
                    style={{ marginTop: 16 }}
                  />
                  <div
                    style={{
                      marginTop: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      maxHeight: 480,
                      overflowY: 'auto',
                    }}
                  >
                    {filteredRetailers.length === 0 ? (
                      <p
                        className="t-meta"
                        style={{ color: 'var(--ink-40)', padding: '16px 0' }}
                      >
                        No retailers found
                      </p>
                    ) : (
                      filteredRetailers.map((r) => {
                        const isSelected = (prefs.selected_retailers ?? []).includes(
                          r.name
                        )
                        return (
                          <button
                            key={r.name}
                            type="button"
                            onClick={() => toggleRetailer(r.name)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 0',
                              borderBottom: '1px solid var(--ink-08)',
                              background: 'transparent',
                              border: 'none',
                              borderBottomColor: 'var(--ink-08)',
                              borderBottomStyle: 'solid',
                              borderBottomWidth: 1,
                              cursor: 'pointer',
                              textAlign: 'left',
                              width: '100%',
                            }}
                          >
                            <span
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                              }}
                            >
                              <span
                                style={{
                                  width: 16,
                                  height: 16,
                                  border: '1.5px solid',
                                  flexShrink: 0,
                                  borderColor: isSelected
                                    ? 'var(--ink)'
                                    : 'var(--ink-25)',
                                  background: isSelected
                                    ? 'var(--ink)'
                                    : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {isSelected && (
                                  <svg
                                    width="10"
                                    height="8"
                                    viewBox="0 0 10 8"
                                    fill="none"
                                  >
                                    <path
                                      d="M1 4L4 7L9 1"
                                      stroke="var(--paper)"
                                      strokeWidth="1.5"
                                      strokeLinecap="square"
                                    />
                                  </svg>
                                )}
                              </span>
                              <span
                                style={{
                                  fontFamily: 'var(--font-sans)',
                                  fontSize: 14,
                                  fontWeight: 500,
                                }}
                              >
                                {r.name}
                              </span>
                            </span>
                            <span
                              className="t-mono"
                              style={{ color: 'var(--ink-55)' }}
                            >
                              {r.spendTier}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </>
              ) : (
                <>
                  <SectionLabel n="01" label="Categories" />
                  <div
                    style={{
                      marginTop: 24,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {ALL_CATEGORIES.map((cat) => {
                      const locked = tier === 'free' && !FREE_CATEGORIES.includes(cat)
                      return (
                        <div
                          key={cat}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '14px 0',
                            borderBottom: '1px solid var(--ink-08)',
                            opacity: locked ? 0.4 : 1,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              minWidth: 0,
                            }}
                          >
                            <CategoryIcon category={cat} size={14} />
                            <span style={{ fontSize: 14, fontWeight: 500 }}>
                              {CATEGORY_LABELS[cat]}
                            </span>
                            {locked && (
                              <span
                                className="t-meta"
                                style={{
                                  color: 'var(--olive-deep)',
                                  fontSize: 9,
                                }}
                              >
                                Paid
                              </span>
                            )}
                          </div>
                          <Toggle
                            checked={prefs.categories[cat]}
                            onChange={() => toggleCategory(cat)}
                            locked={locked}
                            lockedTitle="Upgrade to paid to unlock this category"
                          />
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </Reveal>

            {/* 02 — Deal Types */}
            <Reveal delay={120}>
              <SectionLabel
                n="02"
                label="Deal Types"
                tag={tier === 'free' ? 'Paid Only' : undefined}
              />
              <div
                style={{
                  marginTop: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: tier === 'free' ? 0.4 : 1,
                }}
              >
                {ALL_DEAL_TYPES.map((dt) => (
                  <div
                    key={dt}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 0',
                      borderBottom: '1px solid var(--ink-08)',
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 500 }}>
                      {DEAL_TYPE_LABELS[dt]}
                    </span>
                    <Toggle
                      checked={prefs.deal_types[dt]}
                      onChange={() => toggleDealType(dt)}
                      locked={tier === 'free'}
                      lockedTitle="Upgrade to paid to filter by deal type"
                    />
                  </div>
                ))}
              </div>
            </Reveal>

            {/* 03 — Send Day */}
            <Reveal delay={240}>
              <SectionLabel
                n="03"
                label="Send Day"
                tag={tier === 'free' ? 'Paid Only' : undefined}
              />
              <div
                style={{
                  marginTop: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {SEND_DAYS.map(({ value, label }) => {
                  const locked = tier === 'free' && value !== 'thursday'
                  const active = prefs.send_day === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => !locked && setPrefs((p) => ({ ...p, send_day: value }))}
                      disabled={locked}
                      className={`pill ${active ? 'on' : ''}`}
                      style={{
                        opacity: locked ? 0.4 : 1,
                        cursor: locked ? 'not-allowed' : 'pointer',
                        justifyContent: 'space-between',
                        width: '100%',
                      }}
                    >
                      <span>{label}</span>
                      <span style={{ opacity: 0.6, fontSize: 11 }}>
                        {locked ? '🔒' : active ? '●' : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Section grid 2: Spend | Min Discount | Gender ─────────────── */}
      <section style={{ paddingBottom: 'clamp(56px, 8vw, 96px)' }}>
        <div className="wrap">
          <div className="grid-3" style={{ gap: 48 }}>
            <Reveal>
              <SectionLabel n="04" label="Spend Tier" />
              <p
                style={{
                  marginTop: 16,
                  fontSize: 13,
                  color: 'var(--ink-70)',
                  lineHeight: 1.55,
                }}
              >
                Filter deals by how much brands typically charge.
              </p>
              <div
                style={{
                  marginTop: 20,
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                }}
              >
                {SPEND_TIER_OPTIONS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleSpendTier(v)}
                    className={`pill ${
                      (prefs.spend_tier_filter ?? []).includes(v) ? 'on' : ''
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </Reveal>

            <Reveal delay={120}>
              <SectionLabel
                n="05"
                label="Min Discount"
                tag={tier === 'free' ? 'Paid Only' : undefined}
              />
              <p
                style={{
                  marginTop: 16,
                  fontSize: 13,
                  color: 'var(--ink-70)',
                  lineHeight: 1.55,
                }}
              >
                {tier === 'free'
                  ? 'Free tier locked at 40%+.'
                  : 'Choose how aggressive your filter should be.'}
              </p>
              <div
                style={{
                  marginTop: 20,
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                }}
              >
                {[20, 30, 40, 50].map((v) => {
                  const locked = tier === 'free' && v !== 40
                  const active = prefs.min_discount === v
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() =>
                        !locked &&
                        setPrefs((p) => ({
                          ...p,
                          min_discount: v as 20 | 30 | 40 | 50,
                        }))
                      }
                      disabled={locked}
                      className={`pill ${active ? 'on' : ''}`}
                      style={{ opacity: locked ? 0.4 : 1 }}
                    >
                      {v}%+
                    </button>
                  )
                })}
              </div>
            </Reveal>

            <Reveal delay={240}>
              <SectionLabel n="06" label="Gender" />
              <p
                style={{
                  marginTop: 16,
                  fontSize: 13,
                  color: 'var(--ink-70)',
                  lineHeight: 1.55,
                }}
              >
                Only show deals relevant to the genders you shop for.
              </p>
              <div
                style={{
                  marginTop: 20,
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                }}
              >
                {GENDER_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleGender(value)}
                    className={`pill ${
                      (prefs.gender_filter ?? []).includes(value) ? 'on' : ''
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Footer link to Stores */}
          <div
            style={{
              marginTop: 56,
              paddingTop: 32,
              borderTop: '1px solid var(--ink-15)',
            }}
          >
            <Link
              href="/stores"
              className="t-meta"
              style={{
                color: 'var(--ink)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--ink-15)',
                paddingBottom: 2,
              }}
            >
              View Subscribed Stores →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Account ──────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: 'clamp(48px, 6vw, 80px)',
          paddingBottom: 'clamp(56px, 8vw, 96px)',
          borderTop: '1px solid var(--ink-15)',
        }}
      >
        <div className="wrap">
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 300,
              fontSize: 'clamp(36px, 4vw, 56px)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginBottom: 40,
            }}
          >
            Account
          </h2>

          <div className="grid-2" style={{ gap: 32 }}>
            {/* Change Email */}
            <div className="card">
              <div className="t-eyebrow">Change Email</div>
              <p
                style={{
                  marginTop: 14,
                  fontSize: 14,
                  color: 'var(--ink-70)',
                  lineHeight: 1.6,
                }}
              >
                Update the email address your weekly brief is sent to.
              </p>

              {!showChangeEmail ? (
                <button
                  type="button"
                  onClick={() => setShowChangeEmail(true)}
                  className="btn-ghost"
                  style={{ marginTop: 24 }}
                >
                  Change Email
                </button>
              ) : (
                <div style={{ marginTop: 24 }}>
                  <input
                    type="email"
                    placeholder="new@email.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="field-input"
                  />
                  <div
                    style={{
                      marginTop: 12,
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleChangeEmail}
                      className="btn-primary"
                    >
                      Send Confirmation
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangeEmail(false)
                        setNewEmail('')
                        setEmailMsg('')
                      }}
                      className="t-meta"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--ink-40)',
                        cursor: 'pointer',
                        padding: '0 8px',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {emailMsg && (
                <p
                  style={{
                    marginTop: 12,
                    fontSize: 13,
                    color: 'var(--ink-55)',
                    lineHeight: 1.55,
                  }}
                >
                  {emailMsg}
                </p>
              )}
            </div>

            {/* Delete Account */}
            <div className="card">
              <div className="t-eyebrow" style={{ color: '#9C3A2E' }}>
                Delete Account
              </div>
              <p
                style={{
                  marginTop: 14,
                  fontSize: 14,
                  color: 'var(--ink-70)',
                  lineHeight: 1.6,
                }}
              >
                Permanently delete your account and all preferences. This cannot be
                undone.
              </p>
              <input
                type="text"
                placeholder='Type "delete" to confirm'
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="field-input"
                style={{ marginTop: 24 }}
              />
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={
                  deleteConfirm.toLowerCase() !== 'delete' || deletingAccount
                }
                style={{
                  marginTop: 16,
                  fontFamily: 'var(--font-condensed)',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  padding: '14px 32px',
                  border: '1.5px solid',
                  borderColor:
                    deleteConfirm.toLowerCase() === 'delete'
                      ? '#9C3A2E'
                      : 'var(--ink-15)',
                  background:
                    deleteConfirm.toLowerCase() === 'delete'
                      ? '#9C3A2E'
                      : 'transparent',
                  color:
                    deleteConfirm.toLowerCase() === 'delete'
                      ? 'var(--paper)'
                      : 'var(--ink-40)',
                  cursor:
                    deleteConfirm.toLowerCase() === 'delete' ? 'pointer' : 'default',
                  opacity: deletingAccount ? 0.6 : 1,
                  display: 'inline-block',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                {deletingAccount ? 'Deleting…' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
