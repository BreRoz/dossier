import { google } from 'googleapis'

function getOAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  )
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  })
  return oauth2Client
}

export async function fetchPromotionalEmails(sinceDate: Date): Promise<GmailMessage[]> {
  const auth = getOAuthClient()
  const gmail = google.gmail({ version: 'v1', auth })

  const sinceTimestamp = Math.floor(sinceDate.getTime() / 1000)
  const query = `after:${sinceTimestamp} (category:promotions OR label:manual OR label:restaurant OR label:restaurants) -is:sent`

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 250,
  })

  const messages = listRes.data.messages || []
  if (messages.length === 0) return []

  const results: GmailMessage[] = []
  const batchSize = 10

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize)
    const fetched = await Promise.all(
      batch.map(async (msg) => {
        try {
          const full = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'full',
          })
          return parseGmailMessage(full.data)
        } catch {
          return null
        }
      })
    )
    results.push(...fetched.filter((m): m is GmailMessage => m !== null))
  }

  return results
}

export interface GmailMessage {
  id: string
  from: string
  subject: string
  date: string
  body: string
  isManual: boolean
}

function parseGmailMessage(msg: any): GmailMessage | null {
  if (!msg.id) return null

  const headers = msg.payload?.headers || []
  const getHeader = (name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

  const labels: string[] = msg.labelIds || []
  const isManual = labels.includes('Label_manual') || labels.some((l: string) => l.toLowerCase().includes('manual'))

  const body = extractBody(msg.payload)

  return {
    id: msg.id,
    from: getHeader('from'),
    subject: getHeader('subject'),
    date: getHeader('date'),
    body,
    isManual,
  }
}

function extractBody(payload: any): string {
  if (!payload) return ''

  if (payload.mimeType === 'text/plain' || payload.mimeType === 'text/html') {
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8')
    }
  }

  if (payload.parts) {
    // Prefer HTML over plain text for richer extraction
    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html')
    if (htmlPart?.body?.data) {
      return Buffer.from(htmlPart.body.data, 'base64').toString('utf-8')
    }
    const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain')
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, 'base64').toString('utf-8')
    }
    // Recurse into multipart
    for (const part of payload.parts) {
      const body = extractBody(part)
      if (body) return body
    }
  }

  return ''
}
