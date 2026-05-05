import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAID_STATUSES = new Set(['active', 'trialing'])

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[stripe webhook] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const payload = await request.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid payload'
    console.error('[stripe webhook] signature verification failed:', msg)
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await syncSubscription(event.data.object as Stripe.Subscription)
        break
      }
      case 'customer.subscription.deleted': {
        await clearSubscription(event.data.object as Stripe.Subscription)
        break
      }
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        // Subscription updated events will follow with the new status — log only.
        const invoice = event.data.object as Stripe.Invoice
        console.log(`[stripe webhook] ${event.type}`, {
          invoice: invoice.id,
          customer: invoice.customer,
        })
        break
      }
      default:
        // Ignore other events.
        break
    }
  } catch (err) {
    console.error('[stripe webhook] handler error:', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

  const service = createServiceClient()
  const { data: subscriber } = await service
    .from('subscribers')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!subscriber) {
    console.warn('[stripe webhook] no subscriber for customer', customerId)
    return
  }

  const priceId = subscription.items.data[0]?.price.id ?? null
  const isPaid = PAID_STATUSES.has(subscription.status)

  await service
    .from('subscribers')
    .update({
      tier: isPaid ? 'paid' : 'free',
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      subscription_status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriber.id)
}

async function clearSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

  const service = createServiceClient()
  await service
    .from('subscribers')
    .update({
      tier: 'free',
      stripe_subscription_id: null,
      stripe_price_id: null,
      subscription_status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)
}
