import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
  typescript: true,
})

export type BillingPlan = 'monthly' | 'annual'

export function priceIdForPlan(plan: BillingPlan): string {
  if (plan === 'monthly') return process.env.STRIPE_PRICE_MONTHLY!
  if (plan === 'annual') return process.env.STRIPE_PRICE_ANNUAL!
  throw new Error(`Unknown billing plan: ${plan}`)
}
