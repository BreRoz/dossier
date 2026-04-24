import { format, parseISO } from 'date-fns'
import type { Deal, Subscriber, Edition, Category } from '@/types'
import { CATEGORY_LABELS, ALL_CATEGORIES, FREE_CATEGORIES } from '@/types'
import { getDealLink, formatExpiryDate, formatSavings, rankDeals } from './deals'

// ── Seasonal accent colors (hex — safe for all email clients) ─────────────────
function getCurrentAccent(): string {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return '#C2522B'  // spring — terracotta
  if (month >= 6 && month <= 8) return '#2E5FC4'  // summer — blue
  if (month >= 9 && month <= 11) return '#C97A28' // fall — amber
  return '#1A7A5A'                                 // winter — teal
}

// ── Palette (hex only — oklch not supported in email clients) ─────────────────
const C = {
  bg:         '#DDDCE1',  // outer email background
  card:       '#F8F6F2',  // card/body background
  lightGray:  '#EEEDEE',  // light section bg
  border:     '#D5D4D9',  // dividers
  darkText:   '#4C4A52',  // secondary text
  midGray:    '#929099',  // meta / labels
  lightText:  '#B4B3B8',  // lighter meta
  footerLink: '#7E7C84',  // footer links
  footerText: '#63616A',  // footer body text
  footerBdr:  '#38363D',  // footer divider
  black:      '#0D0D0F',  // headings / primary
  offWhite:   '#F8F6F2',  // inverse text
  hero:       '#0D0D0F',  // hero background
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
  return `<svg width="${size}" height="${size}" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;color:${C.black}">
    <rect x="1" y="1" width="42" height="42" stroke="${C.black}" stroke-width="1.5"/>
    ${CATEGORY_ICONS[cat]}
  </svg>`
}

// Returns true if the savings string ends with % (so "Off" label makes sense)
function isPercentageSavings(savings: string): boolean {
  return savings.endsWith('%')
}

// Render a single deal row — no retailer name (caller handles grouping)
function dealRow(deal: Deal, accent: string, storeUrls: Record<string, string>, isLast: boolean): string {
  const link = getEnrichedLink(deal, storeUrls)
  const expiry = formatExpiryDate(deal.expiration_date)
  const savings = formatSavings(deal)
  const showOff = isPercentageSavings(savings)
  const border = isLast ? '' : `border-bottom:1px solid ${C.border};`

  return `
<tr>
  <td style="padding:14px 0;${border}">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="vertical-align:top;padding-right:16px;">
          <p style="font-family:Arial,sans-serif;font-size:14px;color:${C.darkText};line-height:1.55;margin:0 0 8px;">${deal.description}</p>
          ${deal.promo_code || expiry ? `
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              ${deal.promo_code ? `<td style="padding-right:12px;"><span style="font-family:'Arial Narrow',Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.12em;text-transform:uppercase;border:1.5px solid ${C.black};padding:3px 8px;display:inline-block;">${deal.promo_code}</span></td>` : ''}
              ${expiry ? `<td><span style="font-family:'Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:${C.midGray};">Ends ${expiry}</span></td>` : ''}
            </tr>
          </table>` : ''}
        </td>
        <td style="vertical-align:top;text-align:right;white-space:nowrap;width:72px;">
          <div style="font-family:Georgia,serif;font-size:26px;font-weight:300;line-height:1;color:${C.black};">${savings}</div>
          ${showOff ? `<div style="font-family:'Arial Narrow',Arial,sans-serif;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:${C.midGray};margin-top:2px;">Off</div>` : ''}
        </td>
      </tr>
    </table>
  </td>
</tr>`
}

// Render all deals for one retailer, grouped under that retailer's name
function retailerGroup(
  retailer: string,
  deals: Deal[],
  accent: string,
  storeUrls: Record<string, string>,
  isLastGroup: boolean
): string {
  const link = getRetailerLink(retailer, deals[0], storeUrls)

  return `
<tr>
  <td style="padding-top:20px;${isLastGroup ? '' : ''}">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td>
          <a href="${link}" style="font-family:Arial,sans-serif;font-size:15px;font-weight:bold;letter-spacing:-0.01em;color:${C.black};text-decoration:none;">${retailer}</a>
        </td>
      </tr>
      ${deals.map((d, i) => dealRow(d, accent, storeUrls, i === deals.length - 1 && isLastGroup)).join('')}
    </table>
    ${isLastGroup ? '' : `<div style="height:1px;background:${C.border};margin-top:6px;"></div>`}
  </td>
</tr>`
}

function categorySection(
  category: Category,
  deals: Deal[],
  accent: string,
  storeUrls: Record<string, string>
): string {
  const label = CATEGORY_LABELS[category]
  const ranked = rankDeals(deals)

  // Group by retailer, preserving rank order
  const groups = new Map<string, Deal[]>()
  for (const deal of ranked) {
    const key = deal.retailer
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(deal)
  }
  const groupEntries = Array.from(groups.entries())

  return `
<tr><td style="height:40px;"></td></tr>
<tr>
  <td style="padding:0 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="vertical-align:middle;padding-right:12px;width:1%;">${categoryIcon(category, 16)}</td>
        <td style="vertical-align:middle;">
          <span style="font-family:'Arial Narrow',Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.28em;text-transform:uppercase;color:${accent};">${label}</span>
        </td>
        <td style="vertical-align:middle;padding:0 12px;">
          <div style="height:1px;background:${C.border};"></div>
        </td>
        <td style="vertical-align:middle;white-space:nowrap;">
          <span style="font-family:'Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:${C.midGray};">${groupEntries.length} Store${groupEntries.length !== 1 ? 's' : ''}</span>
        </td>
      </tr>
    </table>
  </td>
</tr>
<tr>
  <td style="padding:0 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      ${groupEntries.map(([retailer, rDeals], i) =>
        retailerGroup(retailer, rDeals, accent, storeUrls, i === groupEntries.length - 1)
      ).join('')}
    </table>
  </td>
</tr>`
}

// Get the best link for a deal row — prefers affiliate, then original (if not Google), then store lookup
function getEnrichedLink(deal: Deal, storeUrls: Record<string, string>): string {
  if (deal.affiliate_link) return deal.affiliate_link
  if (deal.original_link && !deal.original_link.includes('google.com/search')) return deal.original_link
  return storeUrls[deal.retailer.toLowerCase()] || `https://www.google.com/search?q=${encodeURIComponent(deal.retailer)}`
}

// Get the best link for the retailer header — same logic but falls back to store URL first
function getRetailerLink(retailer: string, deal: Deal, storeUrls: Record<string, string>): string {
  return storeUrls[retailer.toLowerCase()]
    || (deal.original_link && !deal.original_link.includes('google.com/search') ? deal.original_link : '')
    || `https://www.google.com/search?q=${encodeURIComponent(retailer)}`
}

export interface GenerateEmailOptions {
  subscriber: Subscriber
  deals: Deal[]
  edition: Edition
  enabledCategories: Category[]
  totalDeals: number
  appUrl: string
  storeUrls?: Record<string, string>  // lowercase retailer name → website URL
}

export function generateEmailHTML(opts: GenerateEmailOptions): string {
  const { subscriber, deals, edition, enabledCategories, totalDeals, appUrl, storeUrls = {} } = opts
  const accent = getCurrentAccent()

  const weekLabel = format(parseISO(edition.week_of), 'MMMM d, yyyy')
  const issueNum = edition.issue_number ? `Issue No. ${edition.issue_number}` : 'Weekly Edition'

  // Group deals by category (deduplicated)
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
<title>DOSSIER Weekly Brief</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style type="text/css">
  body { margin:0; padding:0; background-color:${C.bg}; font-family:Arial,sans-serif; }
  @media only screen and (max-width: 600px) {
    .email-wrapper { padding: 12px 8px !important; }
    .header-pad, .hero-pad, .section-pad, .footer-pad { padding-left: 20px !important; padding-right: 20px !important; }
    .hero-title { font-size: 36px !important; line-height: 1.05 !important; }
    .stat-cell { display: block !important; width: 100% !important; border-right: none !important; border-bottom: 1px solid ${C.border} !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" class="email-wrapper" style="background-color:${C.bg};padding:40px 20px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background-color:${C.card};">

        <!-- HEADER -->
        <tr>
          <td class="header-pad" style="padding:28px 40px 22px;border-bottom:1px solid ${C.border};">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="vertical-align:middle;">
                  <table cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td style="vertical-align:middle;padding-right:8px;">
                        <svg width="24" height="24" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="1" y="1" width="42" height="42" stroke="${C.black}" stroke-width="1.5"/>
                          <rect x="1" y="1" width="20" height="20" fill="${C.black}"/>
                          <rect x="23" y="23" width="20" height="20" fill="${C.black}"/>
                          <line x1="22" y1="1" x2="22" y2="43" stroke="${C.black}" stroke-width="1.5"/>
                          <line x1="1" y1="22" x2="43" y2="22" stroke="${C.black}" stroke-width="1.5"/>
                        </svg>
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="font-family:Georgia,serif;font-size:22px;font-weight:normal;letter-spacing:0.1em;color:${C.black};">DOSSIER</span>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="vertical-align:middle;text-align:right;">
                  <div style="font-family:'Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${C.midGray};line-height:1.7;">
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
          <td class="hero-pad" style="background-color:${C.hero};padding:40px 40px 36px;">
            <p style="font-family:'Arial Narrow',Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:0.28em;text-transform:uppercase;color:${accent};margin:0 0 14px;">This Week's Brief</p>
            <h1 class="hero-title" style="font-family:Georgia,serif;font-size:44px;font-weight:normal;font-style:italic;letter-spacing:-0.02em;line-height:1;color:${C.offWhite};margin:0 0 20px;">The finest deals,<br>curated.</h1>
            <p style="font-family:Arial,sans-serif;font-size:14px;color:${C.lightText};line-height:1.6;margin:0;">${dealsShown} deal${dealsShown !== 1 ? 's' : ''} across ${orderedCategories.length} categor${orderedCategories.length !== 1 ? 'ies' : 'y'}, curated for you.</p>
          </td>
        </tr>

        <!-- STATS BAR -->
        <tr>
          <td style="border-bottom:1px solid ${C.border};">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td class="stat-cell" style="padding:20px 0;border-right:1px solid ${C.border};text-align:center;width:25%;">
                  <div style="font-family:Georgia,serif;font-size:28px;font-weight:normal;line-height:1;color:${C.black};">${edition.emails_scanned ?? '—'}</div>
                  <div style="font-family:'Arial Narrow',Arial,sans-serif;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:${C.midGray};margin-top:4px;">Emails Scanned</div>
                </td>
                <td class="stat-cell" style="padding:20px 0;border-right:1px solid ${C.border};text-align:center;width:25%;">
                  <div style="font-family:Georgia,serif;font-size:28px;font-weight:normal;line-height:1;color:${C.black};">${edition.deals_found ?? '—'}</div>
                  <div style="font-family:'Arial Narrow',Arial,sans-serif;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:${C.midGray};margin-top:4px;">Deals Found</div>
                </td>
                <td class="stat-cell" style="padding:20px 0;border-right:1px solid ${C.border};text-align:center;width:25%;">
                  <div style="font-family:Georgia,serif;font-size:28px;font-weight:normal;line-height:1;color:${C.black};">${edition.retailers_count ?? '—'}</div>
                  <div style="font-family:'Arial Narrow',Arial,sans-serif;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:${C.midGray};margin-top:4px;">Retailers</div>
                </td>
                <td class="stat-cell" style="padding:20px 0;text-align:center;width:25%;">
                  <div style="font-family:Georgia,serif;font-size:28px;font-weight:normal;line-height:1;color:${C.black};">${dealsShown}</div>
                  <div style="font-family:'Arial Narrow',Arial,sans-serif;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:${C.midGray};margin-top:4px;">Your Deals</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- DEALS BY CATEGORY -->
        ${orderedCategories.map((cat) => categorySection(cat, byCategory[cat]!, accent, storeUrls)).join('')}

        <!-- MISSING CATEGORIES NOTE -->
        ${missingCategories.length > 0 ? `
        <tr><td style="height:32px;"></td></tr>
        <tr>
          <td style="padding:0 40px 28px;">
            <div style="border-top:1px solid ${C.border};padding-top:20px;">
              <p style="font-family:'Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${C.midGray};margin:0 0 10px;">No Deals This Week</p>
              ${missingCategories.map((c) => `<p style="font-family:Arial,sans-serif;font-size:13px;color:${C.midGray};margin:0 0 6px;line-height:1.5;">No deals for <strong>${CATEGORY_LABELS[c as Category]}</strong> this week. <a href="${preferencesUrl}" style="color:${C.black};">Adjust preferences.</a></p>`).join('')}
            </div>
          </td>
        </tr>` : ''}

        <!-- UPGRADE BLOCK (free tier only) -->
        ${subscriber.tier === 'free' && dealsLocked > 0 ? `
        <tr>
          <td style="padding:0 40px 40px;">
            <div style="background-color:${C.lightGray};padding:28px;">
              <p style="font-family:'Arial Narrow',Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:0.28em;text-transform:uppercase;color:${accent};margin:0 0 8px;">Unlock More</p>
              <h3 style="font-family:Georgia,serif;font-size:24px;font-weight:normal;color:${C.black};margin:0 0 10px;">You're seeing ${dealsShown} deals. Unlock ${dealsLocked} more.</h3>
              <p style="font-family:Arial,sans-serif;font-size:13px;color:${C.darkText};line-height:1.6;margin:0 0 18px;">Upgrade to access all categories, custom discount thresholds, deal type filters, and flexible send days.</p>
              <a href="${appUrl}/upgrade" style="font-family:'Arial Narrow',Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.18em;text-transform:uppercase;background:${C.black};color:${C.offWhite};text-decoration:none;padding:12px 28px;display:inline-block;">Upgrade Now</a>
            </div>
          </td>
        </tr>` : ''}

        <!-- SPACER -->
        <tr><td style="height:40px;"></td></tr>

        <!-- FOOTER -->
        <tr>
          <td class="footer-pad" style="background-color:${C.black};padding:28px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="vertical-align:middle;">
                  <table cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td style="vertical-align:middle;padding-right:8px;">
                        <svg width="18" height="18" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="1" y="1" width="42" height="42" stroke="${C.offWhite}" stroke-width="1.5"/>
                          <rect x="1" y="1" width="20" height="20" fill="${C.offWhite}"/>
                          <rect x="23" y="23" width="20" height="20" fill="${C.offWhite}"/>
                          <line x1="22" y1="1" x2="22" y2="43" stroke="${C.offWhite}" stroke-width="1.5"/>
                          <line x1="1" y1="22" x2="43" y2="22" stroke="${C.offWhite}" stroke-width="1.5"/>
                        </svg>
                      </td>
                      <td>
                        <span style="font-family:Georgia,serif;font-size:18px;font-weight:normal;letter-spacing:0.1em;color:${C.offWhite};">DOSSIER</span>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="vertical-align:middle;text-align:right;">
                  <a href="${archiveUrl}" style="font-family:'Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${C.footerLink};text-decoration:none;margin-left:16px;">Archive</a>
                  <a href="${preferencesUrl}" style="font-family:'Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${C.footerLink};text-decoration:none;margin-left:16px;">Preferences</a>
                  <a href="${unsubscribeUrl}" style="font-family:'Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${C.footerLink};text-decoration:none;margin-left:16px;">Unsubscribe</a>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:16px;">
                  <div style="height:1px;background-color:${C.footerBdr};margin-bottom:16px;"></div>
                  <p style="font-family:'Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.10em;color:${C.footerText};line-height:1.7;margin:0;">
                    You are receiving this because you subscribed to Dossier Weekly. Deals are curated editorially and may include affiliate relationships. Pricing and availability subject to change without notice.<br><br>
                    DOSSIER Weekly &nbsp;·&nbsp; <a href="${unsubscribeUrl}" style="color:${C.footerText};">Unsubscribe</a>
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
