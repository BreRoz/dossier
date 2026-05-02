import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

function getResend() { return new Resend(process.env.RESEND_API_KEY) }

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

    // ── Brand palette (literal hex / rgba — CSS vars don't work in mail) ──
    const FONT_DISPLAY = "'Fraunces','Cormorant Garamond',Georgia,serif"
    const FONT_BODY =
      "'Inter',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif"
    const BONE = '#F5F3EF'
    const BONE2 = '#EDEBE5'
    const INK = '#0E0E0E'
    const OLIVE_DEEP = '#6E8849'
    const INK70 = 'rgba(14,14,14,0.70)'
    const INK55 = 'rgba(14,14,14,0.55)'
    const INK40 = 'rgba(14,14,14,0.42)'
    const INK15 = 'rgba(14,14,14,0.15)'
    const INK25 = 'rgba(14,14,14,0.25)'

    // Brand mark — two opposite quadrants with hairline cross
    const mark = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
  <rect x="1" y="1" width="20" height="20" stroke="${INK}" stroke-width="1"/>
  <rect x="1" y="1" width="10" height="10" fill="${INK}"/>
  <rect x="11" y="11" width="10" height="10" fill="${INK}"/>
  <line x1="1" y1="11" x2="21" y2="11" stroke="${INK}" stroke-width="0.5" opacity="0.4"/>
  <line x1="11" y1="1" x2="11" y2="21" stroke="${INK}" stroke-width="0.5" opacity="0.4"/>
</svg>`

    // Send the link ourselves via Resend — no Supabase SMTP needed
    const { error: emailError } = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Deal Dossier <noreply@dealdossier.io>',
      to: email,
      subject: 'Your Deal Dossier sign-in link',
      html: `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Your Deal Dossier sign-in link</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<!--[if mso]><style>* { font-family: Georgia, serif !important; }</style><![endif]-->
<style>
  body { margin:0; padding:0; background-color:${BONE2}; }
  a { color: inherit; }
  @media only screen and (max-width:600px) {
    .hpad { padding-left: 28px !important; padding-right: 28px !important; }
    .htitle { font-size: 32px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${BONE2};-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${BONE2};padding:40px 16px 60px;">
<tr><td align="center">

  <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;background-color:${BONE};border:1px solid ${INK15};">

    <!-- Header -->
    <tr>
      <td class="hpad" style="padding:24px 40px;border-bottom:1px solid ${INK15};">
        <table cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="vertical-align:middle;padding-right:10px;">${mark}</td>
            <td style="vertical-align:middle;">
              <span style="font-family:${FONT_DISPLAY};font-size:22px;font-style:italic;font-weight:400;letter-spacing:-0.01em;color:${INK};">Deal Dossier</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td class="hpad" style="padding:56px 40px 48px;">
        <p style="font-family:${FONT_BODY};font-size:11px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:${OLIVE_DEEP};margin:0 0 20px;">Sign In</p>
        <h1 class="htitle" style="font-family:${FONT_DISPLAY};font-size:44px;font-weight:300;letter-spacing:-0.025em;line-height:1.05;color:${INK};margin:0 0 24px;">Your magic link<br><em style="font-style:italic;color:${OLIVE_DEEP};font-weight:300;">is ready.</em></h1>
        <p style="font-family:${FONT_BODY};font-size:15px;color:${INK70};line-height:1.6;margin:0 0 36px;">
          Click the button below to sign in to your Deal Dossier account. This link expires in 24 hours and can only be used once.
        </p>
        <table cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="background-color:${INK};">
              <a href="${magicLink}" style="display:inline-block;font-family:${FONT_BODY};font-size:11.5px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:${BONE};text-decoration:none;padding:14px 32px;">Sign In to Deal Dossier&nbsp;→</a>
            </td>
          </tr>
        </table>
        <p style="font-family:${FONT_BODY};font-size:12px;color:${INK40};line-height:1.6;margin:32px 0 0;">
          If you didn't request this, you can safely ignore this email. Someone may have entered your address by mistake.
        </p>
      </td>
    </tr>

    <!-- Footer fine print -->
    <tr>
      <td class="hpad" style="padding:20px 40px 28px;border-top:1px solid ${INK15};">
        <p style="font-family:${FONT_BODY};font-size:10.5px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:${INK55};margin:0;line-height:1.6;">
          The curated deals brief · Link expires in 24 hours
        </p>
      </td>
    </tr>

  </table>

</td></tr>
</table>
</body>
</html>`,
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
