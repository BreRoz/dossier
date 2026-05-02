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
      // Always use "Deal Dossier" as display name — wrap raw address if env var has no name
      from: (() => {
        const raw = process.env.RESEND_FROM_EMAIL || 'hello@dealdossier.io'
        return raw.includes('<') ? raw : `Deal Dossier <${raw}>`
      })(),
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

const ADMIN_EMAIL = 'bre999@gmail.com'

export async function sendAdminAlert({
  subject,
  body,
}: {
  subject: string
  body: string
}): Promise<void> {
  try {
    const resend = getResend()
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Deal Dossier <hello@dealdossier.io>',
      to: ADMIN_EMAIL,
      subject,
      html: `<pre style="font-family:monospace;font-size:13px;color:#333;white-space:pre-wrap;">${body}</pre>`,
    })
  } catch (err) {
    console.error('Failed to send admin alert:', err)
  }
}

