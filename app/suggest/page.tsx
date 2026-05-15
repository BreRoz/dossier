'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { Reveal } from '@/components/Reveal'
import { createClient } from '@/lib/supabase/client'
import { groupCategories } from '@/lib/categoryGroups'

interface KnownStore {
  name: string
  website: string
  status: string
}

interface Category {
  slug: string
  label: string
  group_name?: string | null
}

// Normalize a store name for fuzzy matching — lowercase, strip everything
// that isn't a letter or digit. "J.Crew" and "jcrew" both become "jcrew".
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export default function SuggestStorePage() {
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState(false)
  const [knownStores, setKnownStores] = useState<KnownStore[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // form state
  const [storeName, setStoreName] = useState('')
  const [website, setWebsite] = useState('')
  const [pickedSlugs, setPickedSlugs] = useState<Set<string>>(new Set())
  const [otherCategory, setOtherCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setSignedIn(!!user?.email)

      try {
        const [storesRes, catsRes] = await Promise.all([
          fetch('/api/stores').then((r) => r.json()),
          fetch('/api/categories').then((r) => r.json()),
        ])
        const stores: KnownStore[] = (storesRes.stores ?? []).map(
          (s: { name: string; website: string; status?: string }) => ({
            name: s.name,
            website: s.website,
            status: s.status ?? 'active',
          })
        )
        setKnownStores(stores)
        setCategories(catsRes.categories ?? [])
      } catch {
        // Autofill is a nice-to-have; failing to load the sheet just means
        // no "we already have it" hint. The form still works.
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Live match: does what they've typed look like a store we already track?
  const existingMatch = useMemo(() => {
    const typed = normalize(storeName)
    if (typed.length < 3) return null
    return (
      knownStores.find((s) => {
        const n = normalize(s.name)
        return n === typed || n.startsWith(typed) || typed.startsWith(n)
      }) ?? null
    )
  }, [storeName, knownStores])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      if (!storeName.trim()) {
        setError('Store name is required.')
        return
      }
      if (!website.trim()) {
        setError('Store website is required.')
        return
      }

      setSubmitting(true)
      try {
        // Combine selected category slugs + "Other" free-text into a single
        // comma-separated string for the existing category text column.
        const labelBySlug: Record<string, string> = {}
        for (const c of categories) labelBySlug[c.slug] = c.label
        const pickedLabels = Array.from(pickedSlugs)
          .map((slug) => labelBySlug[slug])
          .filter(Boolean)
        const allCats = [
          ...pickedLabels,
          ...(otherCategory.trim() ? [`Other: ${otherCategory.trim()}`] : []),
        ]
        const categoryField = allCats.length > 0 ? allCats.join(', ') : null

        const res = await fetch('/api/stores/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_name: storeName,
            website,
            category: categoryField,
            notes: notes || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Submission failed')
        setSubmitted(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setSubmitting(false)
      }
    },
    [storeName, website, pickedSlugs, otherCategory, notes, categories]
  )

  // Render categories grouped by parent (Clothing, Beauty, …). The
  // suggestion form has no search field — grouping is the whole UX win.
  const groupedCategories = useMemo(
    () => groupCategories(categories),
    [categories]
  )

  const togglePick = (slug: string) => {
    setPickedSlugs((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  return (
    <>
      <Nav />

      <section style={{ padding: 'clamp(56px, 8vw, 96px) 0 clamp(48px, 6vw, 72px)' }}>
        <div className="wrap" style={{ maxWidth: 720 }}>
          <Reveal>
            <div className="t-eyebrow">Suggest a Store</div>
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
              Know a brand{' '}
              <em style={{ color: 'var(--olive-deep)', fontWeight: 300 }}>
                we&rsquo;re missing?
              </em>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p
              style={{
                marginTop: 24,
                color: 'var(--ink-70)',
                fontSize: 16,
                lineHeight: 1.6,
                maxWidth: '56ch',
              }}
            >
              We track over a thousand retailers — but there&rsquo;s always more.
              Tell us about a brand you love and we&rsquo;ll evaluate adding it
              to the rotation. We only cover retailers that ship to the USA.
            </p>
          </Reveal>

          {loading ? (
            <p className="t-meta" style={{ marginTop: 56, color: 'var(--ink-55)' }}>
              Loading…
            </p>
          ) : !signedIn ? (
            <Reveal delay={300}>
              <div
                style={{
                  marginTop: 56,
                  border: '1.5px solid var(--ink-15)',
                  padding: 32,
                  background: 'var(--paper)',
                }}
              >
                <div className="t-eyebrow" style={{ marginBottom: 12 }}>
                  Sign in to suggest
                </div>
                <p style={{ color: 'var(--ink-70)', fontSize: 15, lineHeight: 1.55, marginBottom: 24 }}>
                  We ask for a quick sign-in so we can follow up if we have
                  questions about the brand. It&rsquo;s free — magic link, no
                  password.
                </p>
                <Link href="/login?next=/suggest" className="btn-primary">
                  Sign in <span className="arr">→</span>
                </Link>
              </div>
            </Reveal>
          ) : submitted ? (
            <Reveal delay={300}>
              <div
                style={{
                  marginTop: 56,
                  border: '1.5px solid var(--olive-deep)',
                  padding: 32,
                  background: 'var(--paper)',
                }}
              >
                <div className="t-eyebrow" style={{ color: 'var(--olive-deep)', marginBottom: 12 }}>
                  ✓ Suggestion received
                </div>
                <p style={{ color: 'var(--ink-70)', fontSize: 15, lineHeight: 1.55 }}>
                  Thanks — we&rsquo;ll review <strong style={{ color: 'var(--ink)' }}>{storeName}</strong>{' '}
                  and add them to the watchlist if they run regular promotions.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false)
                    setStoreName('')
                    setWebsite('')
                    setPickedSlugs(new Set())
                    setOtherCategory('')
                    setNotes('')
                  }}
                  className="btn-ghost"
                  style={{ marginTop: 24 }}
                >
                  Suggest another <span className="arr">→</span>
                </button>
              </div>
            </Reveal>
          ) : (
            <Reveal delay={300}>
              <form onSubmit={handleSubmit} style={{ marginTop: 56 }}>
                {/* Store name */}
                <div className="t-meta" style={{ marginBottom: 12 }}>
                  Store / Brand Name
                </div>
                <div className="field" style={{ maxWidth: 520 }}>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Brooklinen"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                  />
                </div>
                {existingMatch && (() => {
                  const status = existingMatch.status
                  if (status === 'active') {
                    return (
                      <p
                        className="t-meta"
                        style={{ marginTop: 10, color: 'var(--olive-deep)', maxWidth: 520, lineHeight: 1.5 }}
                      >
                        ✓ Good news — we already track{' '}
                        <strong>{existingMatch.name}</strong>. Their deals flow
                        into matching watchlists. (Different brand, same name?
                        Submit anyway and we&rsquo;ll sort it out.)
                      </p>
                    )
                  }
                  if (status === 'no_email') {
                    return (
                      <p
                        className="t-meta"
                        style={{ marginTop: 10, color: 'var(--ink-55)', maxWidth: 520, lineHeight: 1.5 }}
                      >
                        We&rsquo;ve checked <strong>{existingMatch.name}</strong>{' '}
                        and they don&rsquo;t publish a promotional email list, so
                        we can&rsquo;t track their deals. If that&rsquo;s changed,
                        submit anyway and let us know.
                      </p>
                    )
                  }
                  // 'pending' or anything else → we know about them but haven't
                  // received an email yet
                  return (
                    <p
                      className="t-meta"
                      style={{ marginTop: 10, color: 'var(--ink-55)', maxWidth: 520, lineHeight: 1.5 }}
                    >
                      <strong>{existingMatch.name}</strong> is in our directory
                      but we haven&rsquo;t received a promo email from them yet.
                      Once we do, they&rsquo;ll flip on automatically.
                    </p>
                  )
                })()}

                {/* Website */}
                <div className="t-meta" style={{ marginBottom: 12, marginTop: 32 }}>
                  Store Website
                </div>
                <div className="field" style={{ maxWidth: 520 }}>
                  <input
                    type="url"
                    required
                    placeholder="https://brooklinen.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                {/* Ships to USA — informational reminder, not a gate */}
                <div
                  style={{
                    marginTop: 32,
                    padding: '12px 16px',
                    border: '1px solid var(--ink-15)',
                    background: 'var(--paper)',
                    fontSize: 13.5,
                    color: 'var(--ink-70)',
                    lineHeight: 1.55,
                    maxWidth: 520,
                  }}
                >
                  <strong style={{ color: 'var(--ink)' }}>FYI:</strong> we only track retailers
                  that ship to the USA. Worth a quick check on the brand&rsquo;s site before you
                  submit.
                </div>

                {/* Categories (optional, multi-select + Other) */}
                <div
                  className="t-meta"
                  style={{
                    marginBottom: 8,
                    marginTop: 32,
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                    alignItems: 'baseline',
                  }}
                >
                  <span>What do they sell?</span>
                  <span style={{ color: 'var(--ink-40)' }}>
                    {pickedSlugs.size > 0
                      ? `${pickedSlugs.size} picked`
                      : 'optional — helps us route the brand'}
                  </span>
                </div>
                <div
                  style={{
                    maxHeight: 360,
                    overflowY: 'auto',
                    padding: 8,
                    border: '1px solid var(--ink-15)',
                    background: 'var(--paper)',
                    maxWidth: 520,
                  }}
                >
                  {categories.length === 0 ? (
                    <div
                      style={{
                        padding: 16,
                        textAlign: 'center',
                        color: 'var(--ink-55)',
                        fontSize: 13,
                      }}
                    >
                      Loading…
                    </div>
                  ) : (
                    groupedCategories.map((group) => (
                      <div key={group.name} style={{ marginBottom: 14 }}>
                        <div
                          className="t-meta"
                          style={{
                            padding: '6px 4px 8px',
                            color: 'var(--olive-deep)',
                            letterSpacing: '0.08em',
                            fontSize: 11,
                            textTransform: 'uppercase',
                            position: 'sticky',
                            top: 0,
                            background: 'var(--paper)',
                            zIndex: 1,
                          }}
                        >
                          {group.name}
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                            gap: 6,
                          }}
                        >
                          {group.items.map((c) => {
                            const on = pickedSlugs.has(c.slug)
                            return (
                              <button
                                key={c.slug}
                                type="button"
                                onClick={() => togglePick(c.slug)}
                                style={{
                                  textAlign: 'left',
                                  padding: '8px 10px',
                                  border: `1.5px solid ${on ? 'var(--ink)' : 'var(--ink-15)'}`,
                                  background: on ? 'var(--ink)' : 'transparent',
                                  color: on ? 'var(--paper)' : 'var(--ink)',
                                  cursor: 'pointer',
                                  fontFamily: 'inherit',
                                  fontSize: 13,
                                  transition: 'all .12s',
                                }}
                              >
                                {on ? '✓ ' : '+ '}
                                {c.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Other / freeform fallback */}
                <div
                  className="t-meta"
                  style={{ marginBottom: 8, marginTop: 20, color: 'var(--ink-55)' }}
                >
                  Don&rsquo;t see it? Add your own
                </div>
                <div className="field" style={{ maxWidth: 520 }}>
                  <input
                    type="text"
                    placeholder="e.g. electrolyte drinks, kayak gear"
                    value={otherCategory}
                    onChange={(e) => setOtherCategory(e.target.value)}
                  />
                </div>

                {/* Notes (optional) */}
                <div className="t-meta" style={{ marginBottom: 12, marginTop: 32 }}>
                  Anything else? <span style={{ color: 'var(--ink-40)' }}>(optional)</span>
                </div>
                <textarea
                  placeholder="Why you love them, what kind of deals they run, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    maxWidth: 520,
                    padding: '12px 14px',
                    border: '1px solid var(--ink-15)',
                    background: 'var(--paper)',
                    fontFamily: 'inherit',
                    fontSize: 14.5,
                    color: 'var(--ink)',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: 1.55,
                  }}
                />

                {error && (
                  <p
                    className="t-meta"
                    style={{ marginTop: 24, color: 'oklch(50% 0.2 20)', maxWidth: 520 }}
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{ marginTop: 40 }}
                >
                  {submitting ? 'Submitting…' : (
                    <>
                      Submit Suggestion <span className="arr">→</span>
                    </>
                  )}
                </button>
              </form>
            </Reveal>
          )}
        </div>
      </section>

      <Footer />
    </>
  )
}
