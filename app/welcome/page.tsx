'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CategoryIcon } from '@/components/CategoryIcon'
import { ALL_CATEGORIES, FREE_CATEGORIES, CATEGORY_LABELS } from '@/types'
import type { Category, SendDay } from '@/types'

const SEND_DAYS: { value: SendDay; label: string; sub: string }[] = [
  { value: 'monday',    label: 'Monday',    sub: 'Start the week right' },
  { value: 'tuesday',   label: 'Tuesday',   sub: 'Early week deals' },
  { value: 'wednesday', label: 'Wednesday', sub: 'Mid-week refresh' },
  { value: 'thursday',  label: 'Thursday',  sub: 'The classic' },
  { value: 'friday',    label: 'Friday',    sub: 'Weekend shopping' },
  { value: 'saturday',  label: 'Saturday',  sub: 'Weekend morning read' },
  { value: 'sunday',    label: 'Sunday',    sub: 'Plan the week ahead' },
]

export default function WelcomePage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]         = useState<1 | 2 | 3 | 'done'>(1)
  const [tier, setTier]         = useState<'free' | 'paid'>('free')
  const [firstName, setFirstName] = useState('')
  const [categories, setCategories] = useState<Record<Category, boolean>>(
    Object.fromEntries(ALL_CATEGORIES.map((c) => [c, FREE_CATEGORIES.includes(c)])) as Record<Category, boolean>
  )
  const [sendDay, setSendDay]   = useState<SendDay>('thursday')
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { router.replace('/login'); return }

      const { data: sub } = await supabase
        .from('subscribers')
        .select('tier, onboarding_completed')
        .eq('email', user.email)
        .single()

      if (sub?.onboarding_completed) { router.replace('/preferences'); return }
      if (sub?.tier) setTier(sub.tier)

      // Derive first name from email as a friendly fallback
      const name = user.email.split('@')[0].split('.')[0]
      setFirstName(name.charAt(0).toUpperCase() + name.slice(1))
    }
    load()
  }, [])

  const toggleCategory = (cat: Category) => {
    if (tier === 'free' && !FREE_CATEGORIES.includes(cat)) return
    setCategories((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }

  const handleFinish = async () => {
    setSaving(true)
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories, send_day: sendDay }),
    })
    setSaving(false)
    setStep('done')
  }

  const progress = step === 'done' ? 100 : ((Number(step) - 1) / 3) * 100

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--paper)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Progress bar */}
      {step !== 'done' && (
        <div style={{ height: 3, background: 'var(--ink-06)', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
          <div style={{
            height: '100%', background: 'var(--accent)',
            width: `${progress}%`, transition: 'width 0.4s ease',
          }} />
        </div>
      )}

      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '60px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 560 }}>

          {/* ── Step 1: Welcome ─────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <p style={{
                fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600,
                letterSpacing: '0.28em', textTransform: 'uppercase',
                color: 'var(--accent)', marginBottom: 20,
              }}>
                Step 1 of 3
              </p>
              <h1 style={{
                fontFamily: 'var(--font-serif)', fontSize: 'clamp(44px, 6vw, 72px)',
                fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 0.95,
                color: 'var(--ink)', marginBottom: 32,
              }}>
                Hey{firstName ? `, ${firstName}` : ''}.<br />
                Welcome to<br />
                <em style={{ fontStyle: 'italic' }}>DOSSIER.</em>
              </h1>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 16,
                color: 'var(--ink-70)', lineHeight: 1.7, marginBottom: 16,
              }}>
                We scan hundreds of retailer emails every week so you don't have to.
              </p>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 16,
                color: 'var(--ink-70)', lineHeight: 1.7, marginBottom: 16,
              }}>
                Every week, your personalized brief lands in your inbox — only the deals that meet your standards. No noise, no fluff. Just the good stuff.
              </p>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 16,
                color: 'var(--ink-70)', lineHeight: 1.7, marginBottom: 48,
              }}>
                Takes about 60 seconds to set up. Let's go.
              </p>
              <button
                onClick={() => setStep(2)}
                className="btn-primary"
                style={{ padding: '14px 40px' }}
              >
                Let's Go →
              </button>
            </div>
          )}

          {/* ── Step 2: Categories ──────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <p style={{
                fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600,
                letterSpacing: '0.28em', textTransform: 'uppercase',
                color: 'var(--accent)', marginBottom: 20,
              }}>
                Step 2 of 3
              </p>
              <h1 style={{
                fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px, 5vw, 56px)',
                fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1,
                color: 'var(--ink)', marginBottom: 12,
              }}>
                What do you shop for?
              </h1>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 15,
                color: 'var(--ink-40)', lineHeight: 1.6, marginBottom: 32,
              }}>
                Pick the categories you care about.
                {tier === 'free' && ' More categories available on paid.'}
              </p>

              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 8, marginBottom: 40,
              }}>
                {ALL_CATEGORIES.map((cat) => {
                  const locked = tier === 'free' && !FREE_CATEGORIES.includes(cat)
                  const active = categories[cat]
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      disabled={locked}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 16px', border: '1.5px solid',
                        borderColor: active && !locked ? 'var(--ink)' : 'var(--ink-15)',
                        background: active && !locked ? 'var(--ink)' : 'transparent',
                        cursor: locked ? 'not-allowed' : 'pointer',
                        textAlign: 'left', transition: 'all 0.15s',
                        opacity: locked ? 0.4 : 1,
                      }}
                    >
                      <CategoryIcon
                        category={cat}
                        size={16}
                        color={active && !locked ? 'var(--paper)' : 'var(--ink-40)'}
                      />
                      <span style={{
                        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
                        color: active && !locked ? 'var(--paper)' : 'var(--ink)',
                        flex: 1,
                      }}>
                        {CATEGORY_LABELS[cat]}
                      </span>
                      {locked && (
                        <span style={{ fontSize: 11 }}>🔒</span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    background: 'transparent', color: 'var(--ink-40)',
                    border: '1.5px solid var(--ink-15)', padding: '12px 24px',
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="btn-primary"
                  style={{ padding: '12px 40px' }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Send day ────────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <p style={{
                fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600,
                letterSpacing: '0.28em', textTransform: 'uppercase',
                color: 'var(--accent)', marginBottom: 20,
              }}>
                Step 3 of 3
              </p>
              <h1 style={{
                fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px, 5vw, 56px)',
                fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1,
                color: 'var(--ink)', marginBottom: 12,
              }}>
                When should we<br />send it?
              </h1>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 15,
                color: 'var(--ink-40)', lineHeight: 1.6, marginBottom: 32,
              }}>
                Pick the day that works for you.
                {tier === 'free' && ' Thursday delivery is included on the free plan.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 40 }}>
                {SEND_DAYS.map(({ value, label, sub }) => {
                  const locked = tier === 'free' && value !== 'thursday'
                  const active = sendDay === value
                  return (
                    <button
                      key={value}
                      onClick={() => !locked && setSendDay(value)}
                      disabled={locked}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 20px', border: '1.5px solid',
                        borderColor: active ? 'var(--ink)' : 'var(--ink-15)',
                        background: active ? 'var(--ink)' : 'transparent',
                        cursor: locked ? 'not-allowed' : 'pointer',
                        textAlign: 'left', opacity: locked ? 0.4 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div>
                        <span style={{
                          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                          color: active ? 'var(--paper)' : 'var(--ink)',
                          display: 'block',
                        }}>
                          {label}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-sans)', fontSize: 12,
                          color: active ? 'oklch(75% 0.005 280)' : 'var(--ink-40)',
                        }}>
                          {sub}
                        </span>
                      </div>
                      {locked ? (
                        <span style={{ fontSize: 12 }}>🔒</span>
                      ) : active ? (
                        <span style={{
                          fontFamily: 'var(--font-condensed)', fontSize: 10,
                          letterSpacing: '0.18em', textTransform: 'uppercase',
                          color: 'var(--accent)',
                        }}>
                          ✓
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    background: 'transparent', color: 'var(--ink-40)',
                    border: '1.5px solid var(--ink-15)', padding: '12px 24px',
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="btn-primary"
                  style={{ padding: '12px 40px' }}
                >
                  {saving ? 'Saving...' : 'Finish Setup →'}
                </button>
              </div>
            </div>
          )}

          {/* ── Done ────────────────────────────────────────────────────── */}
          {step === 'done' && (
            <div>
              <p style={{
                fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 600,
                letterSpacing: '0.28em', textTransform: 'uppercase',
                color: 'var(--accent)', marginBottom: 20,
              }}>
                You're all set
              </p>
              <h1 style={{
                fontFamily: 'var(--font-serif)', fontSize: 'clamp(44px, 6vw, 72px)',
                fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 0.95,
                color: 'var(--ink)', marginBottom: 32,
              }}>
                Your first brief<br />
                is on its way.
              </h1>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 16,
                color: 'var(--ink-70)', lineHeight: 1.7, marginBottom: 48,
              }}>
                We'll send your first edition on {sendDay.charAt(0).toUpperCase() + sendDay.slice(1)}. In the meantime, take a look around.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Link
                  href="/stores"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '24px 28px', background: 'var(--ink)',
                    textDecoration: 'none',
                  }}
                >
                  <div>
                    <p style={{
                      fontFamily: 'var(--font-condensed)', fontSize: 10, fontWeight: 600,
                      letterSpacing: '0.22em', textTransform: 'uppercase',
                      color: 'var(--accent)', marginBottom: 4,
                    }}>
                      Stores
                    </p>
                    <p style={{
                      fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
                      color: 'var(--paper)',
                    }}>
                      See which stores we're watching →
                    </p>
                    <p style={{
                      fontFamily: 'var(--font-sans)', fontSize: 13,
                      color: 'oklch(65% 0.005 280)', marginTop: 4,
                    }}>
                      Follow individual retailers and see deal history
                    </p>
                  </div>
                </Link>

                <Link
                  href="/preferences"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '24px 28px', border: '1.5px solid var(--ink-15)',
                    textDecoration: 'none',
                  }}
                >
                  <div>
                    <p style={{
                      fontFamily: 'var(--font-condensed)', fontSize: 10, fontWeight: 600,
                      letterSpacing: '0.22em', textTransform: 'uppercase',
                      color: 'var(--ink-40)', marginBottom: 4,
                    }}>
                      Settings
                    </p>
                    <p style={{
                      fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
                      color: 'var(--ink)',
                    }}>
                      Fine-tune your preferences →
                    </p>
                    <p style={{
                      fontFamily: 'var(--font-sans)', fontSize: 13,
                      color: 'var(--ink-40)', marginTop: 4,
                    }}>
                      Set price thresholds, deal types, gender & spend filters
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '20px 40px', borderTop: 'var(--rule)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--font-condensed)', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink)',
        }}>
          DOSSIER
        </span>
        {step !== 'done' && (
          <span style={{
            fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.15em',
            textTransform: 'uppercase', color: 'var(--ink-40)',
          }}>
            Step {step} of 3
          </span>
        )}
      </div>
    </div>
  )
}
