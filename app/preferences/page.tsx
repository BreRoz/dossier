'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { Reveal } from '@/components/Reveal'
import { createClient } from '@/lib/supabase/client'

interface Category {
  slug: string
  label: string
  sort_order: number
}

interface Watch {
  id: string
  category_slug: string
  category_label: string
  sub_type: string | null
  last_email_sent_at: string | null
  created_at: string
}

export default function PreferencesPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [tier, setTier] = useState<'free' | 'paid'>('free')
  const [weeklyEnabled, setWeeklyEnabled] = useState(true)
  const [savingWeekly, setSavingWeekly] = useState(false)
  const [watches, setWatches] = useState<Watch[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [addingSlug, setAddingSlug] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshResult, setRefreshResult] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        router.push('/login?next=/preferences')
        return
      }
      setEmail(user.email)

      try {
        const [watchesRes, catsRes, accountRes] = await Promise.all([
          fetch('/api/watches').then((r) => r.json()),
          fetch('/api/categories').then((r) => r.json()),
          fetch('/api/account').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ])
        setWatches(watchesRes.watches ?? [])
        setCategories(catsRes.categories ?? [])
        if (accountRes?.tier) setTier(accountRes.tier)
        if (typeof accountRes?.weekly_email_enabled === 'boolean') {
          setWeeklyEnabled(accountRes.weekly_email_enabled)
        }
      } catch (err) {
        console.error(err)
        setError('Failed to load your watchlist. Try refreshing the page.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const watchedSlugs = useMemo(
    () => new Set(watches.map((w) => w.category_slug)),
    [watches]
  )

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase()
    return categories
      .filter((c) => !watchedSlugs.has(c.slug))
      .filter((c) => !q || c.label.toLowerCase().includes(q))
  }, [categories, watchedSlugs, search])

  const addWatch = useCallback(async (slug: string) => {
    setAddingSlug(slug)
    setError(null)
    try {
      const res = await fetch('/api/watches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_slug: slug }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Could not add')
      }
      const watchesRes = await fetch('/api/watches').then((r) => r.json())
      setWatches(watchesRes.watches ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setAddingSlug(null)
    }
  }, [])

  const removeWatch = useCallback(async (id: string) => {
    setRemovingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/watches/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Could not remove')
      }
      setWatches((prev) => prev.filter((w) => w.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove')
    } finally {
      setRemovingId(null)
    }
  }, [])

  const refreshDeals = useCallback(async () => {
    setRefreshing(true)
    setRefreshResult(null)
    setError(null)
    try {
      const res = await fetch('/api/deals/refresh', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Refresh failed')
      const n = data.total_deals as number
      setRefreshResult(
        n > 0
          ? `Sent — ${n} ${n === 1 ? 'deal' : 'deals'} across ${data.watches} ${data.watches === 1 ? 'category' : 'categories'}. Check your inbox.`
          : `Nothing fresh right now. We're watching ${data.watches} ${data.watches === 1 ? 'category' : 'categories'} for you and will check again on the next ingest.`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }, [])

  const toggleWeekly = useCallback(async (next: boolean) => {
    // Optimistic — flip the UI immediately, revert on failure.
    setWeeklyEnabled(next)
    setSavingWeekly(true)
    setError(null)
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekly_email_enabled: next }),
      })
      if (!res.ok) throw new Error('Could not save')
    } catch (err) {
      setWeeklyEnabled(!next)
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingWeekly(false)
    }
  }, [])

  const deleteAccount = useCallback(async () => {
    if (deleteConfirm.toLowerCase() !== 'delete') return
    setDeletingAccount(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) throw new Error('Delete failed')
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
    } catch {
      setError('Failed to delete account. Try again or contact support.')
      setDeletingAccount(false)
    }
  }, [deleteConfirm, router])

  if (loading) {
    return (
      <>
        <Nav />
        <section style={{ padding: 'clamp(80px, 10vw, 140px) 0' }}>
          <div className="wrap" style={{ textAlign: 'center', color: 'var(--ink-55)' }}>
            Loading…
          </div>
        </section>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Nav />

      <section style={{ padding: 'clamp(56px, 8vw, 96px) 0 clamp(48px, 6vw, 72px)' }}>
        <div className="wrap" style={{ maxWidth: 880 }}>
          <Reveal>
            <div className="t-eyebrow">Watchlist</div>
          </Reveal>
          <Reveal delay={100}>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 300,
                fontSize: 'clamp(40px, 6vw, 80px)',
                marginTop: 20,
                lineHeight: 1,
                letterSpacing: '-0.03em',
              }}
            >
              What are you{' '}
              <em style={{ color: 'var(--olive-deep)', fontWeight: 300 }}>shopping for?</em>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p
              style={{
                marginTop: 24,
                color: 'var(--ink-70)',
                fontSize: 16,
                lineHeight: 1.6,
                maxWidth: '60ch',
              }}
            >
              Add what you&rsquo;re hunting for. We&rsquo;ll email deals from across our
              watched retailers as they show up — no waiting for Thursday. Remove a
              category when you&rsquo;ve found what you needed.
            </p>
          </Reveal>

          {error && (
            <Reveal>
              <div
                style={{
                  marginTop: 32,
                  padding: '14px 18px',
                  border: '1px solid oklch(60% 0.15 25)',
                  background: 'oklch(96% 0.02 25)',
                  color: 'oklch(40% 0.15 25)',
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            </Reveal>
          )}

          {/* Active watches */}
          <Reveal delay={280}>
            <div style={{ marginTop: 56 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 16,
                  paddingBottom: 16,
                  borderBottom: '1px solid var(--ink)',
                }}
              >
                <div>
                  <span className="t-mono" style={{ color: 'var(--olive-deep)' }}>01</span>
                  <span
                    style={{
                      marginLeft: 16,
                      fontSize: 12,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      fontWeight: 500,
                    }}
                  >
                    Watching ({watches.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={refreshDeals}
                  disabled={refreshing || watches.length === 0}
                  className="btn-ghost"
                  style={{ fontSize: 11 }}
                >
                  {refreshing ? 'Sending…' : 'Send me deals now →'}
                </button>
              </div>

              {refreshResult && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '12px 16px',
                    border: '1px solid var(--olive-deep)',
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                    fontSize: 13.5,
                    lineHeight: 1.55,
                  }}
                >
                  {refreshResult}
                </div>
              )}

              {watches.length === 0 ? (
                <div
                  style={{
                    marginTop: 24,
                    padding: 32,
                    border: '1px dashed var(--ink-15)',
                    color: 'var(--ink-55)',
                    fontSize: 14.5,
                    lineHeight: 1.6,
                    textAlign: 'center',
                  }}
                >
                  Your watchlist is empty. Add a category below to start tracking deals.
                </div>
              ) : (
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '24px 0 0',
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  {watches.map((w) => (
                    <li
                      key={w.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        border: '1.5px solid var(--ink-15)',
                        background: 'var(--paper)',
                      }}
                    >
                      <div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontStyle: 'italic', fontWeight: 350, color: 'var(--ink)' }}>
                          {w.category_label}
                          {w.sub_type && (
                            <span style={{ fontSize: 16, color: 'var(--ink-55)' }}>
                              {' — '}{w.sub_type}
                            </span>
                          )}
                        </div>
                        {w.last_email_sent_at && (
                          <div className="t-meta" style={{ color: 'var(--ink-40)', marginTop: 4 }}>
                            Last sent {new Date(w.last_email_sent_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeWatch(w.id)}
                        disabled={removingId === w.id}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--ink-55)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-condensed)',
                          fontSize: 11,
                          fontWeight: 500,
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          padding: '6px 10px',
                          opacity: removingId === w.id ? 0.5 : 1,
                        }}
                      >
                        {removingId === w.id ? 'Removing…' : 'Remove'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Reveal>

          {/* Add a watch */}
          <Reveal delay={360}>
            <div style={{ marginTop: 64 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 16,
                  paddingBottom: 16,
                  borderBottom: '1px solid var(--ink)',
                }}
              >
                <div>
                  <span className="t-mono" style={{ color: 'var(--olive-deep)' }}>02</span>
                  <span
                    style={{
                      marginLeft: 16,
                      fontSize: 12,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      fontWeight: 500,
                    }}
                  >
                    Add to Watchlist
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdd((v) => !v)}
                  className="btn-ghost"
                  style={{ fontSize: 11 }}
                >
                  {showAdd ? 'Hide' : 'Browse'} categories →
                </button>
              </div>

              {showAdd && (
                <div style={{ marginTop: 24 }}>
                  <div className="field" style={{ marginBottom: 16 }}>
                    <input
                      type="search"
                      placeholder="Search categories…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: 8,
                    }}
                  >
                    {filteredCategories.length === 0 ? (
                      <div
                        style={{
                          gridColumn: '1/-1',
                          padding: 24,
                          textAlign: 'center',
                          color: 'var(--ink-55)',
                          fontSize: 14,
                        }}
                      >
                        {watchedSlugs.size === categories.length
                          ? 'You’re watching every category. Quite the shopper.'
                          : 'No match. Try a different search.'}
                      </div>
                    ) : (
                      filteredCategories.map((c) => (
                        <button
                          key={c.slug}
                          type="button"
                          onClick={() => addWatch(c.slug)}
                          disabled={addingSlug === c.slug}
                          style={{
                            textAlign: 'left',
                            padding: '12px 14px',
                            border: '1.5px solid var(--ink-15)',
                            background: 'var(--paper)',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            color: 'var(--ink)',
                            fontSize: 14,
                            transition: 'border-color .15s, background .15s',
                            opacity: addingSlug === c.slug ? 0.5 : 1,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--ink)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--ink-15)'
                          }}
                        >
                          {addingSlug === c.slug ? 'Adding…' : `+ ${c.label}`}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </Reveal>

          {/* Account */}
          <Reveal delay={440}>
            <div style={{ marginTop: 80 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 16,
                  paddingBottom: 16,
                  borderBottom: '1px solid var(--ink)',
                }}
              >
                <span className="t-mono" style={{ color: 'var(--olive-deep)' }}>03</span>
                <span
                  style={{
                    fontSize: 12,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                  }}
                >
                  Account
                </span>
              </div>

              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <div className="t-meta" style={{ color: 'var(--ink-55)', marginBottom: 4 }}>
                    Email
                  </div>
                  <div style={{ fontSize: 16, color: 'var(--ink)' }}>{email}</div>
                </div>

                <div>
                  <div className="t-meta" style={{ color: 'var(--ink-55)', marginBottom: 4 }}>
                    Plan
                  </div>
                  <div style={{ fontSize: 16, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    {tier === 'paid' ? 'Personal Shopper (paid)' : 'Free'}
                    {tier === 'free' && (
                      <Link
                        href="/pricing"
                        className="t-meta"
                        style={{
                          color: 'var(--olive-deep)',
                          textDecoration: 'none',
                          borderBottom: '1px solid currentColor',
                        }}
                      >
                        Upgrade →
                      </Link>
                    )}
                  </div>
                </div>

                <div>
                  <div className="t-meta" style={{ color: 'var(--ink-55)', marginBottom: 8 }}>
                    Weekly Email
                  </div>
                  <label
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      cursor: savingWeekly ? 'wait' : 'pointer',
                      maxWidth: 520,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={weeklyEnabled}
                      onChange={(e) => toggleWeekly(e.target.checked)}
                      disabled={savingWeekly}
                      style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 14, color: 'var(--ink-70)', lineHeight: 1.55 }}>
                      Send me a recap each Thursday with the current deals on my
                      watchlist. The &ldquo;send me deals now&rdquo; button always
                      works regardless of this setting.
                    </span>
                  </label>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    padding: 20,
                    border: '1px solid var(--ink-15)',
                    background: 'var(--paper)',
                  }}
                >
                  <div className="t-meta" style={{ color: 'var(--ink-55)' }}>
                    Delete Account
                  </div>
                  <p style={{ marginTop: 8, fontSize: 13.5, color: 'var(--ink-70)', lineHeight: 1.55 }}>
                    Permanently delete your account and all watches. This cannot be
                    undone. Type <code style={{ fontFamily: 'var(--font-mono)' }}>delete</code> below
                    to confirm.
                  </p>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder="type delete"
                      style={{
                        padding: '8px 12px',
                        border: '1px solid var(--ink-15)',
                        background: 'var(--paper)',
                        fontFamily: 'inherit',
                        fontSize: 13.5,
                        color: 'var(--ink)',
                        outline: 'none',
                        flex: '0 0 auto',
                        width: 160,
                      }}
                    />
                    <button
                      type="button"
                      onClick={deleteAccount}
                      disabled={deleteConfirm.toLowerCase() !== 'delete' || deletingAccount}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid oklch(50% 0.2 25)',
                        background: 'transparent',
                        color: 'oklch(50% 0.2 25)',
                        fontFamily: 'var(--font-condensed)',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        cursor: deleteConfirm.toLowerCase() === 'delete' && !deletingAccount ? 'pointer' : 'not-allowed',
                        opacity: deleteConfirm.toLowerCase() === 'delete' && !deletingAccount ? 1 : 0.4,
                      }}
                    >
                      {deletingAccount ? 'Deleting…' : 'Delete Account'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </>
  )
}
