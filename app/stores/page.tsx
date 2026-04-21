'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { DossierLogo } from '@/components/DossierLogo'
import { CategoryIcon } from '@/components/CategoryIcon'
import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/types'
import { CATEGORY_LABELS } from '@/types'
import type { RetailerSummary } from '@/app/api/retailers/route'

interface Stats {
  emails_caught: number
  editions_sent: number
  emails_saved: number
}

function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

function StatCard({
  value,
  label,
  sub,
}: {
  value: number
  label: string
  sub?: string
}) {
  return (
    <div
      style={{
        padding: '32px 40px',
        background: 'var(--ink-06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flex: 1,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 52,
          fontWeight: 300,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          color: 'var(--ink)',
        }}
      >
        {fmt(value)}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-condensed)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
        }}
      >
        {label}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--ink-40)',
            lineHeight: 1.4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  )
}

export default function StoresPage() {
  const supabase = createClient()

  const [stats, setStats] = useState<Stats | null>(null)
  const [retailers, setRetailers] = useState<RetailerSummary[]>([])
  const [subscribedRetailers, setSubscribedRetailers] = useState<string[]>([])
  const [enabledCategories, setEnabledCategories] = useState<string[]>([])
  const [subscriptionMode, setSubscriptionMode] = useState<'category' | 'retailer'>('category')
  const [genderFilter, setGenderFilter] = useState<string[]>(['men', 'women', 'unisex'])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const [statsRes, retailersRes, prefsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/retailers'),
        fetch('/api/preferences'),
      ])

      if (statsRes.ok) setStats(await statsRes.json())

      if (retailersRes.ok) {
        const data = await retailersRes.json()
        setRetailers(data.retailers || [])
      }

      if (prefsRes.ok) {
        const data = await prefsRes.json()
        const prefs = data.preferences || {}
        setSubscriptionMode(prefs.subscription_mode || 'category')
        setGenderFilter(prefs.gender_filter || ['men', 'women', 'unisex'])
        setSubscribedRetailers(prefs.selected_retailers || [])
        const cats = prefs.categories || {}
        setEnabledCategories(
          Object.entries(cats)
            .filter(([, v]) => Boolean(v))
            .map(([k]) => k)
        )
      }

      setLoading(false)
    }
    load()
  }, [])

  // Which retailers to show: filtered by subscription + gender + search
  const visibleRetailers = useMemo(() => {
    return retailers.filter((r) => {
      // search filter
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false

      // subscription scope
      if (subscriptionMode === 'retailer') {
        if (subscribedRetailers.length > 0 && !subscribedRetailers.includes(r.name)) return false
      } else {
        // category mode: show retailers that have deals in enabled categories
        const hasCategory = r.categories.some((c) => enabledCategories.includes(c))
        if (!hasCategory) return false
      }

      return true
    })
  }, [retailers, search, subscriptionMode, subscribedRetailers, enabledCategories])

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
      <nav
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          padding: '0 60px',
          borderBottom: 'var(--rule)',
          position: 'sticky',
          top: 0,
          background: 'var(--paper)',
          zIndex: 10,
        }}
      >
        <Link href="/" style={{ textDecoration: 'none' }}>
          <DossierLogo size={22} wordmarkSize={18} />
        </Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link
            href="/preferences"
            style={{
              fontFamily: 'var(--font-condensed)',
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--ink-40)',
              textDecoration: 'none',
            }}
          >
            Settings
          </Link>
        </div>
      </nav>

      <div className="wrap" style={{ paddingTop: 64, paddingBottom: 120 }}>
        {/* Header */}
        <div style={{ marginBottom: 48, borderBottom: 'var(--rule)', paddingBottom: 40 }}>
          <p className="t-section" style={{ marginBottom: 12 }}>Your Account</p>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 48,
              fontWeight: 300,
              letterSpacing: '-0.02em',
              marginBottom: 12,
            }}
          >
            Subscribed Stores
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 15,
              color: 'var(--ink-40)',
              maxWidth: 520,
              lineHeight: 1.55,
            }}
          >
            Every retail email we catch so you don&rsquo;t have to sort through them yourself.
          </p>
        </div>

        {/* ─── Stats Cards ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: 2,
            marginBottom: 56,
          }}
        >
          <StatCard
            value={stats?.emails_caught ?? 0}
            label="Retail Emails Caught"
            sub="Total promotional emails ingested from partner retailers"
          />
          <StatCard
            value={stats?.editions_sent ?? 0}
            label="Dossier Editions Sent"
            sub="Curated briefs delivered to subscribers"
          />
          <StatCard
            value={stats?.emails_saved ?? 0}
            label="Emails You Didn't Have to Sort Through"
            sub="Emails caught minus editions sent"
          />
        </div>

        {/* ─── Retailer List ───────────────────────────────────────── */}
        <div>
          {/* List header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}
          >
            <div>
              <p className="t-meta" style={{ marginBottom: 4 }}>
                {subscriptionMode === 'retailer'
                  ? `${visibleRetailers.length} Subscribed Retailer${visibleRetailers.length !== 1 ? 's' : ''}`
                  : `${visibleRetailers.length} Retailer${visibleRetailers.length !== 1 ? 's' : ''} in Your Categories`}
              </p>
            </div>
            <input
              type="text"
              placeholder="Search retailers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field-input"
              style={{ maxWidth: 240, padding: '8px 14px' }}
            />
          </div>

          {/* Column headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 160px 120px 100px',
              gap: 16,
              padding: '10px 16px',
              borderBottom: 'var(--rule)',
            }}
          >
            {['Retailer', 'Categories', 'Potential Savings', 'Deals'].map((h) => (
              <span
                key={h}
                style={{
                  fontFamily: 'var(--font-condensed)',
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-40)',
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {visibleRetailers.length === 0 ? (
            <div
              style={{
                padding: '48px 16px',
                textAlign: 'center',
                color: 'var(--ink-40)',
                fontFamily: 'var(--font-condensed)',
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              {search ? 'No retailers match your search' : 'No retailers found for your current subscription'}
            </div>
          ) : (
            visibleRetailers.map((retailer, i) => (
              <RetailerRow key={retailer.name} retailer={retailer} isEven={i % 2 === 0} />
            ))
          )}
        </div>

        {/* Link to settings */}
        <div style={{ marginTop: 48, paddingTop: 40, borderTop: 'var(--rule)' }}>
          <Link
            href="/preferences"
            style={{
              fontFamily: 'var(--font-condensed)',
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--ink)',
              textDecoration: 'underline',
            }}
          >
            Adjust your subscription settings
          </Link>
        </div>
      </div>
    </div>
  )
}

function RetailerRow({
  retailer,
  isEven,
}: {
  retailer: RetailerSummary
  isEven: boolean
}) {
  const cats = retailer.categories.slice(0, 3) as Category[]
  const extra = Math.max(0, retailer.categories.length - 3)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 160px 120px 100px',
        gap: 16,
        padding: '16px 16px',
        background: isEven ? 'transparent' : 'var(--ink-06)',
        alignItems: 'center',
        borderBottom: '1px solid var(--ink-06)',
      }}
    >
      {/* Name */}
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--ink)',
        }}
      >
        {retailer.name}
      </span>

      {/* Categories (icons) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {cats.map((cat) => (
          <span key={cat} title={CATEGORY_LABELS[cat] ?? cat}>
            <CategoryIcon category={cat} size={16} />
          </span>
        ))}
        {extra > 0 && (
          <span
            style={{
              fontFamily: 'var(--font-condensed)',
              fontSize: 9,
              letterSpacing: '0.12em',
              color: 'var(--ink-40)',
            }}
          >
            +{extra}
          </span>
        )}
      </div>

      {/* Potential Savings */}
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          fontWeight: 300,
          color: 'var(--ink)',
        }}
      >
        {retailer.potential_savings !== null ? `${retailer.potential_savings}%` : '—'}
      </span>

      {/* Deal count */}
      <span
        style={{
          fontFamily: 'var(--font-condensed)',
          fontSize: 12,
          letterSpacing: '0.1em',
          color: 'var(--ink-40)',
        }}
      >
        {retailer.deal_count}
      </span>
    </div>
  )
}
