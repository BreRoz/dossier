// Gmail inbox scraping via IMAP + App Password.
//
// Replaces the previous OAuth-based Gmail API implementation. The
// OAuth refresh-token flow had a hard 7-day expiry on unverified apps
// using restricted scopes (Gmail), which forced a manual token refresh
// every week. App Passwords don't rotate — set up once, works
// indefinitely.
//
// Setup:
//   1. Enable 2-Step Verification on the Gmail account
//   2. https://myaccount.google.com/apppasswords → generate
//   3. Set env vars:
//      - GMAIL_SCRAP_EMAIL   = the account address
//      - GMAIL_APP_PASSWORD  = the 16-char app password (no spaces)

import { ImapFlow, type FetchMessageObject } from 'imapflow'
import { simpleParser, type ParsedMail } from 'mailparser'

export interface GmailMessage {
  id: string
  from: string
  subject: string
  date: string
  body: string
  isManual: boolean
  viewInBrowserUrl: string | null
}

function getCreds(): { user: string; pass: string } {
  const user = process.env.GMAIL_SCRAP_EMAIL
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user) throw new Error('GMAIL_SCRAP_EMAIL env var is not set')
  if (!pass) throw new Error('GMAIL_APP_PASSWORD env var is not set')
  // App passwords are shown with spaces — strip just in case
  return { user, pass: pass.replace(/\s+/g, '') }
}

export async function fetchPromotionalEmails(sinceDate: Date): Promise<GmailMessage[]> {
  const { user, pass } = getCreds()

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  })

  const messages: GmailMessage[] = []

  await client.connect()
  try {
    // INBOX includes Primary + Promotions + Updates by default on Gmail,
    // unless the user has hidden categories from IMAP. The downstream
    // pipeline filters transactional / non-deal content via
    // isTransactionalEmail + isJunkDeal + the LLM extraction prompt, so
    // we don't try to be clever with category filtering here.
    const lock = await client.getMailboxLock('INBOX')
    try {
      for await (const msg of client.fetch(
        { since: sinceDate },
        { uid: true, envelope: true, source: true, labels: true }
      )) {
        try {
          const transformed = await transformMessage(msg)
          if (transformed) messages.push(transformed)
        } catch (err) {
          // One bad email shouldn't tank the whole ingest run.
          console.error(`[gmail] failed to parse UID ${msg.uid}:`, err)
        }
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => {
      // Logout failures aren't fatal — the function is about to end.
    })
  }

  return messages
}

async function transformMessage(msg: FetchMessageObject): Promise<GmailMessage | null> {
  if (!msg.source) return null

  const parsed: ParsedMail = await simpleParser(msg.source as Buffer)

  // Message-ID is stable across mailboxes and survives label moves.
  // Fall back to UID-prefixed string only if the email has no Message-ID
  // (rare, but happens with hand-crafted messages).
  const id = (parsed.messageId || `uid-${msg.uid}`).replace(/^<|>$/g, '')

  const fromText =
    parsed.from?.text ||
    (msg.envelope?.from?.[0]
      ? `${msg.envelope.from[0].name ?? ''} <${msg.envelope.from[0].address ?? ''}>`.trim()
      : '')

  const subject = parsed.subject ?? msg.envelope?.subject ?? ''
  const dateObj = parsed.date ?? msg.envelope?.date ?? null
  const date = dateObj ? dateObj.toUTCString() : ''
  const body = parsed.html || parsed.text || ''

  // Gmail X-GM-LABELS — flagged as a Gmail extension by imapflow when
  // we request `labels: true` in the FETCH options. Manual-labeled
  // messages are emails the user has tagged for explicit inclusion
  // regardless of category heuristics.
  const labels: Set<string> = msg.labels ?? new Set()
  const isManual = Array.from(labels).some((l) =>
    typeof l === 'string' && l.toLowerCase().includes('manual')
  )

  return {
    id,
    from: fromText,
    subject,
    date,
    body,
    isManual,
    viewInBrowserUrl: extractViewInBrowserUrl(body),
  }
}

// Find the "view in browser" URL from a retail email's HTML body.
// Retailers use this for subscribers to see the full email with fine print.
function extractViewInBrowserUrl(html: string): string | null {
  if (!html) return null

  // Strategy 1: anchor tag whose visible text mentions "view" + browser/online/email
  const anchorRegex = /<a\s+(?:[^>]*?\s+)?href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let match
  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1]
    const text = match[2].replace(/<[^>]+>/g, '').trim().toLowerCase()
    if (
      text.includes('view') &&
      (text.includes('browser') || text.includes('online') || text.includes('email'))
    ) {
      return href
    }
  }

  // Strategy 2: URL with "view" subdomain (e.g. view.s.freepeople.com)
  // Very common pattern across ESPs (Salesforce MC, Klaviyo, etc.)
  const viewSubdomainMatch = html.match(/href="(https?:\/\/view\.[^"]+)"/i)
  if (viewSubdomainMatch?.[1]) return viewSubdomainMatch[1]

  return null
}
