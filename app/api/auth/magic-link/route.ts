import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { email, redirectTo } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const supabase = createServiceClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dossier2-amber.vercel.app'
    const callbackUrl = redirectTo || `${appUrl}/api/auth/callback`

    // Use Supabase admin API to generate the magic link token
    // This creates the auth session token without sending any email
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: callbackUrl },
    })

    if (error || !data?.properties?.action_link) {
      console.error('generateLink error:', error)
      return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 })
    }

    const magicLink = data.properties.action_link

    // Send the link ourselves via Resend — no Supabase SMTP needed
    const { error: emailError } = await resend.emails.send({
      from: 'DOSSIER <noreply@dealdossier.io>',
      to: email,
      subject: 'Your DOSSIER sign-in link',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f5f4f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 20px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#faf9f6;max-width:560px;width:100%;">

                <!-- Header -->
                <tr>
                  <td style="padding:32px 48px 24px;border-bottom:1px solid #e8e6e0;">
                    <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#0a0a0a;">DOSSIER</span>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:48px 48px 40px;">
                    <p style="font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#b5440a;margin:0 0 16px;">Sign In</p>
                    <h1 style="font-size:32px;font-weight:300;letter-spacing:-0.01em;line-height:1.1;color:#0a0a0a;margin:0 0 20px;">Your magic link<br>is ready.</h1>
                    <p style="font-size:14px;color:#666;line-height:1.65;margin:0 0 32px;">
                      Click the button below to sign in to your DOSSIER account. This link expires in 24 hours and can only be used once.
                    </p>
                    <a href="${magicLink}" style="display:inline-block;background:#0a0a0a;color:#faf9f6;padding:14px 32px;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;">
                      Sign In to DOSSIER
                    </a>
                    <p style="font-size:12px;color:#999;margin:24px 0 0;line-height:1.6;">
                      If you didn't request this, you can safely ignore this email. Someone may have entered your address by mistake.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:24px 48px;background:#0a0a0a;border-top:1px solid #1a1a1a;">
                    <p style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#555;margin:0;line-height:1.7;">
                      DOSSIER · The curated deals brief · Link expires in 24 hours
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

    if (emailError) {
      console.error('Resend send error:', emailError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('magic-link error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
