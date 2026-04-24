import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const RESPONSES = {
  added: {
    status: 'added',
    subject: 'Your store suggestion has been added to Deal Dossier',
    headline: 'Great news — we added them!',
    body: (store: string, note?: string) =>
      `We just added <strong>${store}</strong> to our watchlist. We'll start scanning their promotional emails and you'll see their deals in upcoming editions.${note ? `<br><br>${note}` : ''}`,
  },
  not_us: {
    status: 'declined',
    subject: `We can't add that store to Deal Dossier`,
    headline: 'Thanks for the suggestion.',
    body: (store: string, note?: string) =>
      `Unfortunately <strong>${store}</strong> doesn't ship to the US, so we're not able to add them right now. We'll keep them on our radar if that changes.${note ? `<br><br>${note}` : ''}`,
  },
  no_online_store: {
    status: 'declined',
    subject: `We can't add that store to Deal Dossier`,
    headline: 'Thanks for the suggestion.',
    body: (store: string, note?: string) =>
      `<strong>${store}</strong> doesn't appear to have an online store, so we're not able to track their deals at the moment.${note ? `<br><br>${note}` : ''}`,
  },
  no_deals: {
    status: 'declined',
    subject: `We can't add that store to Deal Dossier`,
    headline: 'Thanks for the suggestion.',
    body: (store: string, note?: string) =>
      `We took a look at <strong>${store}</strong> but they don't regularly offer discounts or promotional deals, so they're not a great fit for Deal Dossier right now. We'll revisit if that changes.${note ? `<br><br>${note}` : ''}`,
  },
}

export async function POST(req: NextRequest) {
  // Verify admin
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!user || (adminEmail && user.email !== adminEmail)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { suggestion_id, response_type, note } = await req.json()
  if (!suggestion_id || !response_type || !RESPONSES[response_type as keyof typeof RESPONSES]) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const db = createServiceClient()

  // Get suggestion + subscriber email
  const { data: suggestion } = await db
    .from('store_suggestions')
    .select('store_name, subscriber_id')
    .eq('id', suggestion_id)
    .single()

  if (!suggestion) return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })

  // Get subscriber email
  let subscriberEmail: string | null = null
  if (suggestion.subscriber_id) {
    const { data: sub } = await db
      .from('subscribers')
      .select('email')
      .eq('id', suggestion.subscriber_id)
      .single()
    subscriberEmail = sub?.email || null
  }

  const response = RESPONSES[response_type as keyof typeof RESPONSES]

  // Send email if we have their address
  if (subscriberEmail) {
    const bodyHtml = response.body(suggestion.store_name, note)
    await resend.emails.send({
      from: 'Deal Dossier <noreply@dealdossier.io>',
      to: subscriberEmail,
      subject: response.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f5f4f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 20px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#faf9f6;max-width:560px;width:100%;">
                <tr>
                  <td style="padding:32px 48px 24px;border-bottom:1px solid #e8e6e0;">
                    <span style="font-size:18px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#0a0a0a;">Deal Dossier</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px 48px;">
                    <p style="font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#b5440a;margin:0 0 16px;">Store Suggestion</p>
                    <h1 style="font-size:28px;font-weight:300;letter-spacing:-0.01em;color:#0a0a0a;margin:0 0 20px;">${response.headline}</h1>
                    <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;">${bodyHtml}</p>
                    <p style="font-size:13px;color:#999;line-height:1.6;margin:0;">
                      Thanks for helping make Deal Dossier better.<br>— The Deal Dossier Team
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 48px;background:#0a0a0a;">
                    <p style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#555;margin:0;">
                      Deal Dossier · dealdossier.io
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    })
  }

  // Update suggestion status
  await db
    .from('store_suggestions')
    .update({ status: response.status })
    .eq('id', suggestion_id)

  return NextResponse.json({ success: true, emailed: !!subscriberEmail })
}
