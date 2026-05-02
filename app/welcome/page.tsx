'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Reveal } from '@/components/Reveal'
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

  const [step, setStep] = useState<1 | 2 | 3 | 'done'>(1)
  const [tier, setTier] = useState<'free' | 'paid'>('free')
  const [firstName, setFirstName] = useState('')
  const [categories, setCategories] = useState<Record<Category, boolean>>(
    Object.fromEntries(
      ALL_CATEGORIES.map((c) => [c, FREE_CATEGORIES.includes(c)])
    ) as Record<Category, boolean>
  )
  const [sendDay, setSendDay] = useState<SendDay>('thursday')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.email) {
        router.replace('/login')
        return
      }

      const { data: sub } = await supabase
        .from('subscribers')
        .select('tier, onboarding_completed')
        .eq('email', user.email)
        .single()

      if (sub?.onboarding_completed) {
        router.replace('/preferences')
        return
      }
      if (sub?.tier) setTier(sub.tier)

      // Friendly first-name fallback derived from local part of email
      const name = user.email.split('@')[0].split('.')[0]
      setFirstName(name.charAt(0).toUpperCase() + name.slice(1))
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const progress =
    step === 'done' ? 1 : (Number(step) - 1) / 3

  return (
    <>
      {/* Progress bar — pinned to top */}
      {step !== 'done' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'var(--ink-08)',
            zIndex: 40,
          }}
        >
          <div
            style={{
              height: '100%',
              background: 'var(--olive-deep)',
              width: `${progress * 100}%`,
              transition: 'width .8s var(--easing)',
            }}
          />
        </div>
      )}

      <section
        style={{
          minHeight: '90vh',
          display: 'flex',
          alignItems: 'center',
          padding: 'clamp(80px, 10vw, 140px) 0',
        }}
      >
        <div className="wrap" style={{ maxWidth: 720 }}>

          {/* ── Step 1: Welcome ─────────────────────────────────────── */}
          {step === 1 && (
            <>
              <Reveal>
                <div className="t-eyebrow">Step 01 / 03</div>
              </Reveal>
              <Reveal delay={100}>
                <h1
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 300,
                    fontSize: 'clamp(44px, 6.5vw, 88px)',
                    marginTop: 20,
                    lineHeight: 1,
                    letterSpacing: '-0.025em',
                  }}
                >
                  {firstName ? `Hey, ${firstName}.` : 'Hey there.'}
                  <br />
                  Welcome to{' '}
                  <em style={{ color: 'var(--olive-deep)', fontWeight: 300 }}>
                    Deal Dossier.
                  </em>
                </h1>
              </Reveal>
              <Reveal delay={200}>
                <p
                  style={{
                    marginTop: 32,
                    fontSize: 18,
                    color: 'var(--ink-70)',
                    lineHeight: 1.55,
                    maxWidth: '46ch',
                  }}
                >
                  We scan hundreds of retailer emails every week so you don&rsquo;t
                  have to. Every week, your personalized brief lands in your inbox
                  — only the deals that meet your standards. No noise, no fluff.
                </p>
              </Reveal>
              <Reveal delay={300}>
                <p className="t-meta" style={{ marginTop: 32, color: 'var(--ink-40)' }}>
                  Takes about 60 seconds.
                </p>
              </Reveal>
              <Reveal delay={400}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-primary"
                  style={{ marginTop: 40 }}
                >
                  Let&rsquo;s Go <span className="arr">→</span>
                </button>
              </Reveal>
            </>
          )}

          {/* ── Step 2: Categories ──────────────────────────────────── */}
          {step === 2 && (
            <>
              <div className="t-eyebrow">Step 02 / 03</div>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 300,
                  fontSize: 'clamp(40px, 5.5vw, 72px)',
                  marginTop: 20,
                  lineHeight: 1,
                  letterSpacing: '-0.025em',
                }}
              >
                What do you{' '}
                <em style={{ color: 'var(--olive-deep)', fontWeight: 300 }}>
                  shop for?
                </em>
              </h1>
              <p
                style={{
                  marginTop: 24,
                  fontSize: 16,
                  color: 'var(--ink-70)',
                  lineHeight: 1.55,
                  maxWidth: '46ch',
                }}
              >
                Pick the categories you care about.
                {tier === 'free' && ' More categories available on paid.'}
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 12,
                  marginTop: 40,
                }}
              >
                {ALL_CATEGORIES.map((cat) => {
                  const locked = tier === 'free' && !FREE_CATEGORIES.includes(cat)
                  const active = categories[cat]
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      disabled={locked}
                      style={{
                        padding: '18px 22px',
                        border: '1px solid',
                        borderColor: active && !locked ? 'var(--ink)' : 'var(--ink-15)',
                        background: active && !locked ? 'var(--ink)' : 'transparent',
                        color: active && !locked ? 'var(--paper)' : 'var(--ink)',
                        opacity: locked ? 0.4 : 1,
                        textAlign: 'left',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 14,
                        fontWeight: 500,
                        letterSpacing: '0.04em',
                        cursor: locked ? 'not-allowed' : 'pointer',
                        transition: 'all .3s var(--easing)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>{CATEGORY_LABELS[cat]}</span>
                      {locked ? (
                        <span style={{ fontSize: 11 }}>🔒</span>
                      ) : active ? (
                        <span>✓</span>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              <div style={{ marginTop: 40, display: 'flex', gap: 16 }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-ghost"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-primary"
                >
                  Next <span className="arr">→</span>
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Send day ────────────────────────────────────── */}
          {step === 3 && (
            <>
              <div className="t-eyebrow">Step 03 / 03</div>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 300,
                  fontSize: 'clamp(40px, 5.5vw, 72px)',
                  marginTop: 20,
                  lineHeight: 1,
                  letterSpacing: '-0.025em',
                }}
              >
                When should we{' '}
                <em style={{ color: 'var(--olive-deep)', fontWeight: 300 }}>
                  send it?
                </em>
              </h1>
              <p
                style={{
                  marginTop: 24,
                  fontSize: 16,
                  color: 'var(--ink-70)',
                  lineHeight: 1.55,
                  maxWidth: '46ch',
                }}
              >
                {tier === 'free'
                  ? 'Thursday is included on the free plan. Other days require paid.'
                  : 'Pick the day that works for you.'}
              </p>

              <div
                style={{
                  marginTop: 40,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  background: 'var(--ink-15)',
                }}
              >
                {SEND_DAYS.map(({ value, label, sub }) => {
                  const locked = tier === 'free' && value !== 'thursday'
                  const active = sendDay === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => !locked && setSendDay(value)}
                      disabled={locked}
                      style={{
                        padding: '20px 24px',
                        background: active ? 'var(--ink)' : 'var(--paper)',
                        color: active ? 'var(--paper)' : 'var(--ink)',
                        opacity: locked ? 0.4 : 1,
                        cursor: locked ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        textAlign: 'left',
                        border: 'none',
                        transition: 'all .3s var(--easing)',
                      }}
                    >
                      <span>
                        <span
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: 22,
                            fontStyle: active ? 'italic' : 'normal',
                            fontWeight: 350,
                            letterSpacing: '-0.01em',
                            display: 'block',
                          }}
                        >
                          {label}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: 12,
                            color: active ? 'var(--paper-on-ink-55)' : 'var(--ink-55)',
                            marginTop: 2,
                            display: 'block',
                          }}
                        >
                          {sub}
                        </span>
                      </span>
                      {locked ? <span>🔒</span> : active ? <span>✓</span> : null}
                    </button>
                  )
                })}
              </div>

              <div style={{ marginTop: 40, display: 'flex', gap: 16 }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-ghost"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Saving…' : (
                    <>
                      Finish Setup <span className="arr">→</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── Done ─────────────────────────────────────────────────── */}
          {step === 'done' && (
            <>
              <Reveal>
                <div className="t-eyebrow" style={{ color: 'var(--olive-deep)' }}>
                  ✓ You&rsquo;re all set
                </div>
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
                  }}
                >
                  Your first brief
                  <br />
                  <em style={{ color: 'var(--olive-deep)', fontWeight: 300 }}>
                    is on its way.
                  </em>
                </h1>
              </Reveal>
              <Reveal delay={200}>
                <p
                  style={{
                    marginTop: 32,
                    fontSize: 17,
                    color: 'var(--ink-70)',
                    lineHeight: 1.55,
                    maxWidth: '46ch',
                  }}
                >
                  We&rsquo;ll send your first edition on{' '}
                  {sendDay.charAt(0).toUpperCase() + sendDay.slice(1)}. In the
                  meantime, take a look around.
                </p>
              </Reveal>

              <div
                style={{
                  marginTop: 56,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <Reveal delay={300}>
                  <Link
                    href="/stores"
                    className="card card-dark"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '28px 32px',
                      cursor: 'pointer',
                      textDecoration: 'none',
                    }}
                  >
                    <div>
                      <div className="t-eyebrow" style={{ color: 'var(--olive)' }}>
                        Stores
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: 26,
                          fontStyle: 'italic',
                          marginTop: 8,
                          fontWeight: 350,
                          color: 'var(--paper)',
                        }}
                      >
                        See which stores we&rsquo;re watching
                      </div>
                    </div>
                    <span style={{ fontSize: 24, color: 'var(--paper)' }}>→</span>
                  </Link>
                </Reveal>
                <Reveal delay={380}>
                  <Link
                    href="/preferences"
                    className="card"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '28px 32px',
                      cursor: 'pointer',
                      textDecoration: 'none',
                    }}
                  >
                    <div>
                      <div className="t-eyebrow">Settings</div>
                      <div
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: 26,
                          fontStyle: 'italic',
                          marginTop: 8,
                          fontWeight: 350,
                        }}
                      >
                        Fine-tune your preferences
                      </div>
                    </div>
                    <span style={{ fontSize: 24 }}>→</span>
                  </Link>
                </Reveal>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}
