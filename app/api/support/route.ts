import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const ISSUE_LABELS: Record<string, string> = {
  'no-emails':     'Not receiving emails',
  'cant-login':    "Can't log in / didn't get magic link",
  'delete-account': 'Want to delete my account',
  'subscription':  'Question about my subscription',
  'bug':           'Something looks wrong / bug report',
  'other':         'Other',
}

export async function POST(req: NextRequest) {
  try {
    const { email, issue_type, message } = await req.json()

    if (!email || !issue_type || !message?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const issueLabel = ISSUE_LABELS[issue_type] || issue_type

    const { error } = await resend.emails.send({
      from: 'Deal Dossier Support <noreply@dealdossier.io>',
      to: 'bre999@gmail.com',
      reply_to: email,
      subject: `[Support] ${issueLabel}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 24px;">New Support Request</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600; width: 140px; color: #666; font-size: 13px;">From</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 13px;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600; color: #666; font-size: 13px;">Issue</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 13px;">${issueLabel}</td>
            </tr>
          </table>
          <h3 style="font-size: 14px; font-weight: 600; color: #666; margin-bottom: 12px;">Message</h3>
          <p style="font-size: 14px; line-height: 1.7; color: #333; white-space: pre-wrap;">${message}</p>
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 11px; color: #999;">Reply directly to this email to respond to ${email}</p>
        </div>
      `,
    })

    if (error) {
      console.error('Support email error:', error)
      return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Support route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
