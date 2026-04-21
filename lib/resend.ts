import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || 'placeholder')
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<{ id: string } | null> {
  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@dossier.email',
      to,
      subject,
      html,
    })
    if (error) return null
    return data
  } catch {
    return null
  }
}

export async function sendMagicLink({
  to,
  magicLink,
}: {
  to: string
  magicLink: string
}): Promise<boolean> {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F7F6F3;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:60px 20px;">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#F7F6F3;border:1px solid #D4D3D0;">
      <tr>
        <td style="padding:48px;">
          <div style="font-family:Georgia,serif;font-size:24px;font-weight:300;letter-spacing:0.08em;color:#0D0D0F;margin-bottom:32px;">DOSSIER</div>
          <h1 style="font-family:Georgia,serif;font-size:32px;font-weight:300;letter-spacing:-0.01em;color:#0D0D0F;margin:0 0 16px;line-height:1.1;">Your sign-in link.</h1>
          <p style="font-family:Arial,sans-serif;font-size:14px;color:oklch(35% 0.010 280);line-height:1.6;margin:0 0 32px;">Click the button below to sign in to your Dossier account. This link expires in 24 hours.</p>
          <a href="${magicLink}" style="display:inline-block;background:#0D0D0F;color:#F7F6F3;font-family:Arial Narrow,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;padding:14px 32px;">Sign In to Dossier</a>
          <p style="font-family:Arial,sans-serif;font-size:11px;color:#999;margin:24px 0 0;line-height:1.6;">If you didn't request this, you can safely ignore this email.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

  const result = await sendEmail({
    to,
    subject: 'Sign in to DOSSIER',
    html,
  })
  return result !== null
}
