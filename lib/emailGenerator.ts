import { format, parseISO } from 'date-fns'
import type { Deal, Subscriber, Edition, Category } from '@/types'
import { CATEGORY_LABELS, ALL_CATEGORIES, FREE_CATEGORIES } from '@/types'
import { getDealLink, formatExpiryDate, formatSavings, rankDeals } from './deals'

const ACCENT_FALL = 'oklch(62% 0.155 48)'

function getCurrentAccent(): string {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return 'oklch(64% 0.160 22)'   // spring
  if (month >= 6 && month <= 8) return 'oklch(56% 0.160 248)'  // summer
  if (month >= 9 && month <= 11) return ACCENT_FALL              // fall
  return 'oklch(42% 0.120 168)'                                  // winter
}

const CATEGORY_ICONS: Record<Category, string> = {
  'fashion':       `<rect x="1" y="1" width="20" height="42" fill="currentColor"/>`,
  'accessories':   `<circle cx="22" cy="22" r="10" stroke="currentColor" stroke-width="3"/><circle cx="22" cy="22" r="3" fill="currentColor"/><line x1="22" y1="1" x2="22" y2="12" stroke="currentColor" stroke-width="2"/><line x1="22" y1="32" x2="22" y2="43" stroke="currentColor" stroke-width="2"/><line x1="1" y1="22" x2="12" y2="22" stroke="currentColor" stroke-width="2"/><line x1="32" y1="22" x2="43" y2="22" stroke="currentColor" stroke-width="2"/>`,
  'beauty':        `<circle cx="22" cy="22" r="14" fill="currentColor"/>`,
  'baby':          `<rect x="14" y="14" width="16" height="16" fill="currentColor"/>`,
  'entertainment': `<polygon points="8,4 8,40 40,22" fill="currentColor"/>`,
  'grocery':       `<rect x="7" y="7" width="8" height="8" fill="currentColor"/><rect x="18" y="7" width="8" height="8" fill="currentColor"/><rect x="29" y="7" width="8" height="8" fill="currentColor"/><rect x="7" y="18" width="8" height="8" fill="currentColor"/><rect x="18" y="18" width="8" height="8" fill="currentColor"/><rect x="29" y="18" width="8" height="8" fill="currentColor"/><rect x="7" y="29" width="8" height="8" fill="currentColor"/><rect x="18" y="29" width="8" height="8" fill="currentColor"/><rect x="29" y="29" width="8" height="8" fill="currentColor"/>`,
  'home':          `<rect x="1" y="23" width="42" height="20" fill="currentColor"/>`,
  'kids':          `<rect x="23" y="1" width="20" height="20" fill="currentColor"/><rect x="1" y="23" width="20" height="20" fill="currentColor"/>`,
  'shoes':         `<line x1="4" y1="40" x2="40" y2="4" stroke="currentColor" stroke-width="6" stroke-linecap="square"/><line x1="4" y1="34" x2="34" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="square"/><line x1="10" y1="40" x2="40" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>`,
  'restaurants':   `<rect x="8" y="1" width="8" height="42" fill="currentColor"/><rect x="28" y="1" width="8" height="42" fill="currentColor"/>`,
  'tools':         `<line x1="1" y1="1" x2="43" y2="43" stroke="currentColor" stroke-width="4" stroke-linecap="square"/><line x1="43" y1="1" x2="1" y2="43" stroke="currentColor" stroke-width="4" stroke-linecap="square"/>`,
  'tech':          `<line x1="22" y1="1" x2="22" y2="43" stroke="currentColor" stroke-width="1.5"/><line x1="1" y1="22" x2="43" y2="22" stroke="currentColor" stroke-width="1.5"/><circle cx="22" cy="22" r="7" fill="currentColor"/><circle cx="22" cy="7" r="3" fill="currentColor"/><circle cx="22" cy="37" r="3" fill="currentColor"/><circle cx="7" cy="22" r="3" fill="currentColor"/><circle cx="37" cy="22" r="3" fill="currentColor"/>`,
  'travel':        `<path d="M 1 30 A 21 21 0 0 1 43 30" fill="currentColor"/><line x1="1" y1="30" x2="43" y2="30" stroke="currentColor" stroke-width="1.5"/><line x1="22" y1="1" x2="22" y2="30" stroke="currentColor" stroke-width="1.5"/>`,
}

function categoryIcon(cat: Category, size = 16): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;color:#0D0D0F">
    <rect x="1" y="1" width="42" height="42" stroke="#0D0D0F" stroke-width="1.5"/>
    ${CATEGORY_ICONS[cat]}
  </svg>`
}

function dealBlock(deal: Deal, accent: string): string {
  const link = getDealLink(deal)
  const expiry = formatExpiryDate(deal.expiration_date)
  const savings = formatSavings(deal)

  return `
<tr>
  <td style="padding:20px 0;border-bottom:1px solid oklch(94% 0.005 280);">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="vertical-align:top;">
          <a href="${link}" style="font-family:'Barlow',Arial,sans-serif;font-size:16px;font-weight:600;letter-spacing:-0.01em;color:#0D0D0F;text-decoration:none;display:block;margin-bottom:6px;">${deal.retailer}</a>
          <p style="font-family:'Barlow',Arial,sans-serif;font-size:14px;color:oklch(35% 0.010 280);line-height:1.55;margin:0 0 10px;">${deal.description}</p>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            ${deal.promo_code ? `<span style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;border:1.5px solid #0D0D0F;padding:3px 10px;display:inline-block;">${deal.promo_code}</span>` : ''}
            ${expiry ? `<span style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:10px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:oklch(62% 0.010 280);">Ends ${expiry}</span>` : ''}
          </div>
        </td>
        <td style="vertical-align:top;text-align:right;padding-left:16px;white-space:nowrap;">
          <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:300;line-height:1;color:#0D0D0F;">${savings}</div>
          <div style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:oklch(62% 0.010 280);margin-top:2px;">Off</div>
        </td>
      </tr>
    </table>
  </td>
</tr>`
}

function categorySection(category: Category, deals: Deal[], accent: string): string {
  const label = CATEGORY_LABELS[category]
  const ranked = rankDeals(deals)

  return `
<tr><td style="height:40px;"></td></tr>
<tr>
  <td style="padding:0 48px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="vertical-align:middle;padding-right:16px;width:1%;">
          ${categoryIcon(category, 18)}
        </td>
        <td style="vertical-align:middle;">
          <span style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:${accent};">${label}</span>
        </td>
        <td style="vertical-align:middle;">
          <div style="height:1px;background:oklch(85% 0.008 280);"></div>
        </td>
        <td style="vertical-align:middle;padding-left:12px;white-space:nowrap;">
          <span style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:oklch(62% 0.010 280);">${deals.length} Deal${deals.length !== 1 ? 's' : ''}</span>
        </td>
      </tr>
    </table>
  </td>
</tr>
<tr>
  <td style="padding:0 48px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      ${ranked.map((d) => dealBlock(d, accent)).join('')}
    </table>
  </td>
</tr>`
}

export interface GenerateEmailOptions {
  subscriber: Subscriber
  deals: Deal[]
  edition: Edition
  enabledCategories: Category[]
  totalDeals: number
  appUrl: string
}

export function generateEmailHTML(opts: GenerateEmailOptions): string {
  const { subscriber, deals, edition, enabledCategories, totalDeals, appUrl } = opts
  const accent = getCurrentAccent()

  const weekLabel = format(parseISO(edition.week_of), 'MMMM d, yyyy')
  const issueNum = edition.issue_number ? `Issue No. ${edition.issue_number}` : 'Weekly Edition'

  // Group deals by category
  const byCategory: Partial<Record<Category, Deal[]>> = {}
  for (const deal of deals) {
    for (const cat of deal.categories) {
      if (enabledCategories.includes(cat as Category)) {
        if (!byCategory[cat as Category]) byCategory[cat as Category] = []
        byCategory[cat as Category]!.push(deal)
      }
    }
  }

  // Remove duplicate deals per category
  for (const cat of Object.keys(byCategory) as Category[]) {
    const seen = new Set<string>()
    byCategory[cat] = byCategory[cat]!.filter((d) => {
      if (seen.has(d.id)) return false
      seen.add(d.id)
      return true
    })
  }

  const orderedCategories = ALL_CATEGORIES.filter(
    (c) => byCategory[c] && byCategory[c]!.length > 0
  )

  const dealsShown = deals.length
  const dealsLocked = Math.max(0, totalDeals - dealsShown)

  // Missing categories message
  const missingCategories = enabledCategories.filter((c) => !byCategory[c] || byCategory[c]!.length === 0)

  const preferencesUrl = `${appUrl}/preferences`
  const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(subscriber.email)}`
  const archiveUrl = `${appUrl}/archive`

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>DOSSIER — Weekly Brief</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;600&display=swap" rel="stylesheet">
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:oklch(88% 0.006 280);font-family:'Barlow',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:oklch(88% 0.006 280);padding:40px 20px;">
  <tr>
    <td align="center">
      <table width="680" cellpadding="0" cellspacing="0" role="presentation" style="max-width:680px;width:100%;background-color:oklch(98% 0.004 90);">

        <!-- HEADER -->
        <tr>
          <td style="padding:32px 48px 24px;border-bottom:1px solid oklch(85% 0.008 280);">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="vertical-align:middle;">
                  <table cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td style="vertical-align:middle;padding-right:10px;">
                        <svg width="28" height="28" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="1" y="1" width="42" height="42" stroke="#0D0D0F" stroke-width="1.5"/>
                          <rect x="1" y="1" width="20" height="20" fill="#0D0D0F"/>
                          <rect x="23" y="23" width="20" height="20" fill="#0D0D0F"/>
                          <line x1="22" y1="1" x2="22" y2="43" stroke="#0D0D0F" stroke-width="1.5"/>
                          <line x1="1" y1="22" x2="43" y2="22" stroke="#0D0D0F" stroke-width="1.5"/>
                        </svg>
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;font-weight:300;letter-spacing:0.08em;color:#0D0D0F;">DOSSIER</span>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="vertical-align:middle;text-align:right;">
                  <div style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:oklch(62% 0.010 280);line-height:1.7;">
                    ${issueNum}<br>
                    Week of ${weekLabel}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- HERO -->
        <tr>
          <td style="background-color:#0D0D0F;padding:48px 48px 40px;">
            <p style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:${accent};margin:0 0 16px;">This Week's Brief</p>
            <h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:52px;font-weight:300;letter-spacing:-0.02em;line-height:0.95;color:oklch(98% 0.004 90);margin:0 0 24px;">The <em style="font-style:italic;">finest</em><br>deals, curated.</h1>
            <p style="font-family:'Barlow',Arial,sans-serif;font-size:14px;color:oklch(72% 0.005 280);line-height:1.6;margin:0;max-width:440px;">Your personalized weekly brief — ${dealsShown} deal${dealsShown !== 1 ? 's' : ''} across ${orderedCategories.length} categor${orderedCategories.length !== 1 ? 'ies' : 'y'}, curated for you.</p>
          </td>
        </tr>

        <!-- STATS BAR -->
        <tr>
          <td style="border-bottom:1px solid oklch(85% 0.008 280);">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="padding:24px 32px;border-right:1px solid oklch(85% 0.008 280);text-align:center;">
                  <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:32px;font-weight:300;line-height:1;letter-spacing:-0.02em;color:#0D0D0F;">${edition.emails_scanned}</div>
                  <div style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:oklch(62% 0.010 280);margin-top:4px;">Emails Scanned</div>
                </td>
                <td style="padding:24px 32px;border-right:1px solid oklch(85% 0.008 280);text-align:center;">
                  <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:32px;font-weight:300;line-height:1;letter-spacing:-0.02em;color:#0D0D0F;">${edition.deals_found}</div>
                  <div style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:oklch(62% 0.010 280);margin-top:4px;">Deals Found</div>
                </td>
                <td style="padding:24px 32px;border-right:1px solid oklch(85% 0.008 280);text-align:center;">
                  <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:32px;font-weight:300;line-height:1;letter-spacing:-0.02em;color:#0D0D0F;">${edition.retailers_count}</div>
                  <div style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:oklch(62% 0.010 280);margin-top:4px;">Retailers</div>
                </td>
                <td style="padding:24px 32px;text-align:center;">
                  <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:32px;font-weight:300;line-height:1;letter-spacing:-0.02em;color:#0D0D0F;">${dealsShown}</div>
                  <div style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:oklch(62% 0.010 280);margin-top:4px;">Your Deals</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- DEALS BY CATEGORY -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          ${orderedCategories.map((cat) => categorySection(cat, byCategory[cat]!, accent)).join('')}
        </table>

        <!-- MISSING CATEGORIES -->
        ${missingCategories.length > 0 ? `
        <tr><td style="height:40px;"></td></tr>
        <tr>
          <td style="padding:0 48px 32px;">
            <div style="border-top:1px solid oklch(85% 0.008 280);padding-top:24px;">
              <p style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:oklch(62% 0.010 280);margin:0 0 12px;">No Deals This Week</p>
              ${missingCategories.map((c) => `<p style="font-family:'Barlow',Arial,sans-serif;font-size:13px;color:oklch(62% 0.010 280);margin:0 0 6px;line-height:1.5;">There are no deals for <strong>${CATEGORY_LABELS[c as Category]}</strong> this week. <a href="${preferencesUrl}" style="color:#0D0D0F;">Adjust preferences.</a></p>`).join('')}
            </div>
          </td>
        </tr>` : ''}

        <!-- UPGRADE BLOCK (free tier only) -->
        ${subscriber.tier === 'free' && dealsLocked > 0 ? `
        <tr>
          <td style="padding:0 48px 48px;">
            <div style="background-color:oklch(94% 0.005 280);padding:32px;margin-top:8px;">
              <p style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:${accent};margin:0 0 8px;">Unlock More</p>
              <h3 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:300;letter-spacing:-0.01em;color:#0D0D0F;margin:0 0 12px;">You're seeing ${dealsShown} deals. Unlock ${dealsLocked} more.</h3>
              <p style="font-family:'Barlow',Arial,sans-serif;font-size:14px;color:oklch(35% 0.010 280);line-height:1.6;margin:0 0 20px;">Upgrade to access all ${ALL_CATEGORIES.length} categories, custom discount thresholds, deal type filters, and flexible send days.</p>
              <a href="${appUrl}/upgrade" style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;background:#0D0D0F;color:oklch(98% 0.004 90);text-decoration:none;padding:14px 32px;display:inline-block;">Upgrade Now</a>
            </div>
          </td>
        </tr>` : ''}

        <!-- FOOTER -->
        <tr>
          <td style="background-color:#0D0D0F;padding:32px 48px;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="vertical-align:middle;">
                  <table cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td style="vertical-align:middle;padding-right:10px;">
                        <svg width="20" height="20" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="1" y="1" width="42" height="42" stroke="#F7F6F3" stroke-width="1.5"/>
                          <rect x="1" y="1" width="20" height="20" fill="#F7F6F3"/>
                          <rect x="23" y="23" width="20" height="20" fill="#F7F6F3"/>
                          <line x1="22" y1="1" x2="22" y2="43" stroke="#F7F6F3" stroke-width="1.5"/>
                          <line x1="1" y1="22" x2="43" y2="22" stroke="#F7F6F3" stroke-width="1.5"/>
                        </svg>
                      </td>
                      <td>
                        <span style="font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;font-weight:300;letter-spacing:0.08em;color:oklch(98% 0.004 90);">DOSSIER</span>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="vertical-align:middle;text-align:right;">
                  <a href="${archiveUrl}" style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:oklch(55% 0.01 280);text-decoration:none;margin-left:20px;">Archive</a>
                  <a href="${preferencesUrl}" style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:oklch(55% 0.01 280);text-decoration:none;margin-left:20px;">Preferences</a>
                  <a href="${unsubscribeUrl}" style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:oklch(55% 0.01 280);text-decoration:none;margin-left:20px;">Unsubscribe</a>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:20px;border-top:1px solid oklch(25% 0.01 280);margin-top:20px;">
                  <p style="font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:10px;letter-spacing:0.12em;color:oklch(45% 0.01 280);line-height:1.7;margin:0;">
                    You are receiving this because you subscribed to Dossier Weekly. Deals are curated editorially and may include affiliate relationships. Pricing and availability subject to change without notice. Prices confirmed at time of publication.<br><br>
                    Dossier Media, Inc. &middot; 340 Pine Street &middot; San Francisco, CA 94104
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}
