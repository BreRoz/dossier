import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  _stripe = new Stripe(key, {
    apiVersion: '2026-04-22.dahlia',
    typescript: true,
  })
  return _stripe
}

export type BillingPlan = 'monthly' | 'annual'

export function priceIdForPlan(plan: BillingPlan): string {
  if (plan === 'monthly') {
    const id = process.env.STRIPE_PRICE_MONTHLY
    if (!id) throw new Error('STRIPE_PRICE_MONTHLY is not configured')
    return id
  }
  if (plan === 'annual') {
    const id = process.env.STRIPE_PRICE_ANNUAL
    if (!id) throw new Error('STRIPE_PRICE_ANNUAL is not configured')
    return id
  }
  throw new Error(`Unknown billing plan: ${plan}`)
}
