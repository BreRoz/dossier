import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getStripe, priceIdForPlan } from '@/lib/stripe'

const Body = z.object({
  plan: z.enum(['monthly', 'annual']),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = Body.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: subscriber } = await service
    .from('subscribers')
    .select('id, email, stripe_customer_id, stripe_subscription_id, subscription_status, tier')
    .eq('email', user.email)
    .single()

  if (!subscriber) {
    return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
  }

  // Reject if already on an active paid subscription — manage via portal instead.
  if (
    subscriber.tier === 'paid' &&
    ['active', 'trialing'].includes(subscriber.subscription_status ?? '')
  ) {
    return NextResponse.json(
      { error: 'Already subscribed. Use the billing portal to change plan.' },
      { status: 409 }
    )
  }

  const stripe = getStripe()

  // Get or create Stripe Customer.
  let customerId = subscriber.stripe_customer_id as string | null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: subscriber.email,
      metadata: { subscriber_id: subscriber.id },
    })
    customerId = customer.id
    await service
      .from('subscribers')
      .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq('id', subscriber.id)
  }

  // Create incomplete subscription — payment is collected client-side via Elements.
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceIdForPlan(parsed.data.plan) }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
      payment_method_types: ['card'],
    },
    expand: ['latest_invoice.confirmation_secret'],
    metadata: { subscriber_id: subscriber.id },
  })

  const invoice = subscription.latest_invoice as Stripe.Invoice | null
  const clientSecret = invoice?.confirmation_secret?.client_secret

  if (!clientSecret) {
    console.error('[create-subscription] missing confirmation_secret', {
      subscriptionId: subscription.id,
    })
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    subscriptionId: subscription.id,
    clientSecret,
  })
}
