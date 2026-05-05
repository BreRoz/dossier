'use client'

import { useMemo, useState } from 'react'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

type Plan = 'monthly' | 'annual'

const PLAN_LABEL: Record<Plan, { price: string; period: string; note: string }> = {
  monthly: { price: '$4.99', period: '/month', note: 'Cancel anytime.' },
  annual: { price: '$45', period: '/year', note: 'Save 25% — billed annually.' },
}

export function UpgradeFlow() {
  const [plan, setPlan] = useState<Plan>('annual')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Lazy-load Stripe.js only on the client; bail out cleanly if the key is missing.
  const stripePromise = useMemo<Promise<Stripe | null> | null>(() => {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!key) return null
    return loadStripe(key)
  }, [])

  if (!stripePromise) {
    return (
      <div
        style={{
          border: '1.5px solid var(--ink-15)',
          padding: 24,
          background: 'var(--paper)',
          color: 'var(--ink-70)',
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        Billing isn&rsquo;t configured for this environment. Set{' '}
        <code style={{ fontFamily: 'monospace' }}>
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        </code>{' '}
        and redeploy.
      </div>
    )
  }

  const startCheckout = async () => {
    setStarting(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout')
      setClientSecret(data.clientSecret)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setStarting(false)
    }
  }

  if (clientSecret) {
    return (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'flat',
            variables: {
              colorPrimary: '#3a3a2f',
              colorBackground: '#f4ede0',
              colorText: '#1a1a1a',
              colorDanger: '#a64d2f',
              fontFamily: 'Georgia, "Times New Roman", serif',
              borderRadius: '0px',
              spacingUnit: '4px',
            },
          },
        }}
      >
        <PaymentForm plan={plan} />
      </Elements>
    )
  }

  return (
    <div>
      <div className="t-eyebrow" style={{ marginBottom: 12 }}>
        Choose your plan
      </div>
      <div role="radiogroup" style={{ display: 'grid', gap: 12, marginBottom: 32 }}>
        {(['annual', 'monthly'] as Plan[]).map((p) => {
          const info = PLAN_LABEL[p]
          const active = plan === p
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPlan(p)}
              style={{
                textAlign: 'left',
                padding: '20px 24px',
                border: `1.5px solid ${active ? 'var(--ink)' : 'var(--ink-15)'}`,
                background: active ? 'var(--paper)' : 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: 'var(--ink)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 16,
                transition: 'border-color .15s, background .15s',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>
                  {p}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-70)', marginTop: 4 }}>
                  {info.note}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, lineHeight: 1, fontWeight: 300 }}>
                {info.price}
                <span style={{ fontSize: 14, color: 'var(--ink-55)', fontStyle: 'italic', marginLeft: 4 }}>
                  {info.period}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {error && (
        <p className="t-meta" style={{ marginBottom: 16, color: 'oklch(50% 0.2 20)' }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={startCheckout}
        disabled={starting}
        className="btn-primary"
      >
        {starting ? 'Loading…' : (
          <>
            Continue to payment <span className="arr">→</span>
          </>
        )}
      </button>
    </div>
  )
}

function PaymentForm({ plan }: { plan: Plan }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setSubmitting(true)
    setError(null)

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pricing/success`,
      },
    })

    // confirmPayment redirects on success. If we get here, something went wrong.
    if (submitError) {
      setError(submitError.message ?? 'Payment failed')
    }
    setSubmitting(false)
  }

  const info = PLAN_LABEL[plan]

  return (
    <form onSubmit={handleSubmit}>
      <div className="t-eyebrow" style={{ marginBottom: 12 }}>
        Payment details
      </div>
      <div style={{ marginBottom: 24, color: 'var(--ink-70)', fontSize: 14 }}>
        You&rsquo;ll be charged{' '}
        <strong style={{ color: 'var(--ink)' }}>
          {info.price}
          {info.period}
        </strong>
        . {info.note}
      </div>

      <PaymentElement />

      {error && (
        <p className="t-meta" style={{ marginTop: 16, color: 'oklch(50% 0.2 20)' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="btn-primary"
        style={{ marginTop: 32 }}
      >
        {submitting ? 'Processing…' : (
          <>
            Subscribe <span className="arr">→</span>
          </>
        )}
      </button>
      <div className="t-meta" style={{ marginTop: 16, color: 'var(--ink-40)' }}>
        Powered by Stripe · Cancel anytime
      </div>
    </form>
  )
}
