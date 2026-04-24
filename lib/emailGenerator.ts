import { format, parseISO } from 'date-fns'
import type { Deal, Subscriber, Edition, Category } from '@/types'
import { CATEGORY_LABELS, ALL_CATEGORIES } from '@/types'
import { formatExpiryDate, formatSavings, rankDeals } from './deals'

// ── Seasonal accent colors (hex) ──────────────────────────────────────────────
function getCurrentAccent(): string {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return '#C2522B'  // spring — terracotta
  if (month >= 6 && month <= 8) return '#2E5FC4'  // summer — blue
  if (month >= 9 && month <= 11) return '#C97A28' // fall — amber
  return '#1A7A5A'                                 // winter — teal
}

// ── Palette ───────────────────────────────────────────────────────────────────
// oklch values from reference, converted to hex for email client compatibility
const C = {
  ink:       '#0D0D0F',  // var(--ink)       oklch(9% 0.010 280)
  ink70:     '#4C4A52',  // var(--ink-70)    oklch(35% 0.010 280)
  ink40:     '#929099',  // var(--ink-40)    oklch(62% 0.010 280)
  ink15:     '#D5D4D9',  // var(--ink-15)    oklch(85% 0.008 280)
  ink06:     '#EEEDEE',  // var(--ink-06)    oklch(94% 0.005 280)
  paper:     '#F8F6F2',  // var(--paper)     oklch(98% 0.004 90)
  bg:        '#DDDCE1',  // body bg          oklch(88% 0.006 280)
  footer25:  '#38363D',  // footer divider   oklch(25% 0.01 280)
  footer55:  '#7E7C84',  // footer links     oklch(55% 0.01 280)
  footer45:  '#63616A',  // footer fine      oklch(45% 0.01 280)
  footer72:  '#B4B3B8',  // hero sub         oklch(72% 0.005 280)
}

// ── Category symbols (Unicode — renders in all email clients) ─────────────────
const CATEGORY_SYMBOLS: Record<Category, string> = {
  'fashion':       '&#9670;',
  'accessories':   '&#9675;',
  'beauty':        '&#9679;',
  'baby':          '&#9632;',
  'entertainment': '&#9654;',
  'grocery':       '&#8801;',
  'home':          '&#8962;',
  'kids':          '&#9633;',
  'shoes':         '&#8725;',
  'restaurants':   '&#10022;',
  'tools':         '&#10005;',
  'tech':          '&#8857;',
  'travel':        '&#9698;',
}

function isPercentageSavings(savings: string): boolean {
  return savings.endsWith('%')
}

// Get best link for a deal (affiliate > original > store lookup > Google)
function getEnrichedLink(deal: Deal, storeUrls: Record<string, string>): string {
  if (deal.affiliate_link) return deal.affiliate_link
  if (deal.original_link && !deal.original_link.includes('google.com/search')) return deal.original_link
  return storeUrls[deal.retailer.toLowerCase()]
    || `https://www.google.com/search?q=${encodeURIComponent(deal.retailer)}`
}

function getRetailerLink(retailer: string, deal: Deal, storeUrls: Record<string, string>): string {
  return storeUrls[retailer.toLowerCase()]
    || (deal.original_link && !deal.original_link.includes('google.com/search') ? deal.original_link : null)
    || `https://www.google.com/search?q=${encodeURIComponent(retailer)}`
}

// ── Single deal row (within a retailer group) ─────────────────────────────────
function dealRow(deal: Deal, isLastInGroup: boolean): string {
  const expiry = formatExpiryDate(deal.expiration_date)
  const savings = formatSavings(deal)
  const showOff = isPercentageSavings(savings)

  return `
<tr>
  <td style="padding:20px 0;${isLastInGroup ? '' : `border-bottom:1px solid ${C.ink06};`}">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="vertical-align:top;padding-right:16px;">
          <p style="font-family:Arial,sans-serif;font-size:14px;color:${C.ink70};line-height:1.55;margin:0 0 10px;">${deal.description}</p>
          ${deal.promo_code || expiry ? `
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              ${deal.promo_code ? `<td style="padding-right:14px;vertical-align:middle;"><span style="font-family:'Arial Narrow',Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:0.14em;text-transform:uppercase;border:1.5px solid ${C.ink};padding:3px 10px;color:${C.ink};display:inline-block;">${deal.promo_code}</span></td>` : ''}
              ${expiry ? `<td style="vertical-align:middle;"><span style="font-family:'Arial Narrow',Arial,sans-serif;font-size:10px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:${C.ink40};">Ends ${expiry}</span></td>` : ''}
            </tr>
          </table>` : ''}
        </td>
        <td style="vertical-align:top;text-align:right;white-space:nowrap;width:72px;">
          <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:300;line-height:1;color:${C.ink};">${savings}</div>
          ${showOff ? `<div style="font-family:'Arial Narrow',Arial,sans-serif;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:${C.ink40};margin-top:2px;">Off</div>` : ''}
        </td>
      </tr>
    </table>
  </td>
</tr>`
}

// ── Retailer group (name + all its deals) ─────────────────────────────────────
function retailerGroup(
  retailer: string,
  deals: Deal[],
  storeUrls: Record<string, string>,
  isLastGroup: boolean
): string {
  const link = getRetailerLink(retailer, deals[0], storeUrls)

  return `
<tr>
  <td style="padding-top:${isLastGroup ? '0' : '4px'};">
    <a href="${link}" style="font-family:Arial,sans-serif;font-size:16px;font-weight:bold;letter-spacing:-0.01em;color:${C.ink};text-decoration:none;display:block;padding-top:20px;padding-bottom:4px;">${retailer}</a>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      ${deals.map((d, i) => dealRow(d, i === deals.length - 1)).join('')}
    </table>
  </td>
</tr>`
}

// ── Category section ──────────────────────────────────────────────────────────
function categorySection(
  category: Category,
  deals: Deal[],
  accent: string,
  storeUrls: Record<string, string>
): string {
  const label = CATEGORY_LABELS[category]
  const symbol = CATEGORY_SYMBOLS[category]
  const ranked = rankDeals(deals)

  // Group by retailer, preserving rank order
  const groups = new Map<string, Deal[]>()
  for (const deal of ranked) {
    if (!groups.has(deal.retailer)) groups.set(deal.retailer, [])
    groups.get(deal.retailer)!.push(deal)
  }
  const groupEntries = Array.from(groups.entries())

  return `
<!-- Category spacer -->
<tr><td style="height:40px;"></td></tr>

<!-- Category header -->
<tr>
  <td style="padding:0 48px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="vertical-align:middle;white-space:nowrap;padding-right:12px;">
          <span style="font-size:14px;color:${accent};">${symbol}</span>&nbsp;<span style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:0.28em;text-transform:uppercase;color:${accent};">${label}</span>
        </td>
        <td style="vertical-align:middle;width:100%;">
          <div style="height:1px;background:${C.ink15};"></div>
        </td>
        <td style="vertical-align:middle;white-space:nowrap;padding-left:12px;">
          <span style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:${C.ink40};">${groupEntries.length} Store${groupEntries.length !== 1 ? 's' : ''}</span>
        </td>
      </tr>
    </table>
  </td>
</tr>

<!-- Deals -->
<tr>
  <td style="padding:0 48px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      ${groupEntries.map(([retailer, rDeals], i) =>
        retailerGroup(retailer, rDeals, storeUrls, i === groupEntries.length - 1)
      ).join('')}
    </table>
  </td>
</tr>`
}

// ── Main export ───────────────────────────────────────────────────────────────
export interface GenerateEmailOptions {
  subscriber: Subscriber
  deals: Deal[]
  edition: Edition
  enabledCategories: Category[]
  totalDeals: number
  appUrl: string
  storeUrls?: Record<string, string>
}

export function generateEmailHTML(opts: GenerateEmailOptions): string {
  const { subscriber, deals, edition, enabledCategories, totalDeals, appUrl, storeUrls = {} } = opts
  const accent = getCurrentAccent()

  const weekLabel = format(parseISO(edition.week_of), 'MMMM d, yyyy')
  const issueNum = edition.issue_number ? `Issue No. ${edition.issue_number}` : 'Weekly Edition'

  // Group deals by category (deduplicated per category)
  const byCategory: Partial<Record<Category, Deal[]>> = {}
  for (const deal of deals) {
    for (const cat of deal.categories) {
      if (enabledCategories.includes(cat as Category)) {
        if (!byCategory[cat as Category]) byCategory[cat as Category] = []
        byCategory[cat as Category]!.push(deal)
      }
    }
  }
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

  const preferencesUrl = `${appUrl}/preferences`
  const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(subscriber.email)}`
  const archiveUrl = `${appUrl}/archive`

  const retailersCount = edition.retailers_count ?? '—'
  const dealsFound = edition.deals_found ?? '—'

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>DOSSIER Weekly Brief</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;600&display=swap" rel="stylesheet">
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  body { margin:0; padding:0; background-color:${C.bg}; }
  @media only screen and (max-width:600px) {
    .wrap  { padding: 12px 8px !important; }
    .hpad  { padding-left: 20px !important; padding-right: 20px !important; }
    .heropad { padding: 32px 20px 28px !important; }
    .htitle  { font-size: 38px !important; }
    .statcell { display: block !important; width: 100% !important; border-right: none !important; border-bottom: 1px solid ${C.ink15} !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" class="wrap" style="background-color:${C.bg};padding:40px 20px 80px;">
<tr><td align="center">

  <table width="680" cellpadding="0" cellspacing="0" role="presentation" style="max-width:680px;width:100%;background-color:${C.paper};">

    <!-- ── HEADER ── -->
    <tr>
      <td class="hpad" style="padding:32px 48px 24px;border-bottom:1px solid ${C.ink15};">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="vertical-align:middle;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <svg width="28" height="28" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="1" y="1" width="42" height="42" stroke="${C.ink}" stroke-width="1.5"/>
                      <rect x="1" y="1" width="20" height="20" fill="${C.ink}"/>
                      <rect x="23" y="23" width="20" height="20" fill="${C.ink}"/>
                      <line x1="22" y1="1" x2="22" y2="43" stroke="${C.ink}" stroke-width="1.5"/>
                      <line x1="1" y1="22" x2="43" y2="22" stroke="${C.ink}" stroke-width="1.5"/>
                    </svg>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;font-weight:300;letter-spacing:0.08em;color:${C.ink};">DOSSIER</span>
                  </td>
                </tr>
              </table>
            </td>
            <td style="vertical-align:middle;text-align:right;">
              <div style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${C.ink40};line-height:1.7;">
                ${issueNum}<br>Week of ${weekLabel}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── HERO ── -->
    <tr>
      <td class="heropad" style="background-color:${C.ink};padding:48px 48px 40px;">
        <p style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:${accent};margin:0 0 16px;">This Week's Brief</p>
        <h1 class="htitle" style="font-family:'Cormorant Garamond',Georgia,serif;font-size:56px;font-weight:300;letter-spacing:-0.02em;line-height:0.95;color:${C.paper};margin:0 0 24px;">The <em style="font-style:italic;">finest</em><br>deals, curated.</h1>
        <p style="font-family:'Barlow',Arial,sans-serif;font-size:14px;color:${C.footer72};line-height:1.6;margin:0;">${dealsShown} deal${dealsShown !== 1 ? 's' : ''} across ${orderedCategories.length} categor${orderedCategories.length !== 1 ? 'ies' : 'y'}, curated for you.</p>
      </td>
    </tr>

    <!-- ── STATS BAR ── -->
    <tr>
      <td style="border-bottom:1px solid ${C.ink15};">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td class="statcell" style="padding:24px 0;border-right:1px solid ${C.ink15};text-align:center;width:33%;">
              <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:36px;font-weight:300;line-height:1;letter-spacing:-0.02em;color:${C.ink};">${dealsFound}</div>
              <div style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${C.ink40};margin-top:4px;">Deals This Week</div>
            </td>
            <td class="statcell" style="padding:24px 0;border-right:1px solid ${C.ink15};text-align:center;width:33%;">
              <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:36px;font-weight:300;line-height:1;letter-spacing:-0.02em;color:${C.ink};">${retailersCount}</div>
              <div style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${C.ink40};margin-top:4px;">Retailers</div>
            </td>
            <td class="statcell" style="padding:24px 0;text-align:center;width:33%;">
              <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:36px;font-weight:300;line-height:1;letter-spacing:-0.02em;color:${C.ink};">${dealsShown}</div>
              <div style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${C.ink40};margin-top:4px;">Your Deals</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── DEALS BY CATEGORY ── -->
    ${orderedCategories.map((cat) => categorySection(cat, byCategory[cat]!, accent, storeUrls)).join('')}

    <!-- ── UPGRADE BLOCK (free tier only) ── -->
    ${subscriber.tier === 'free' && dealsLocked > 0 ? `
    <tr><td style="height:40px;"></td></tr>
    <tr>
      <td class="hpad" style="padding:0 48px 48px;">
        <div style="background-color:${C.ink06};padding:32px;">
          <p style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:${accent};margin:0 0 8px;">Unlock More</p>
          <h3 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:300;color:${C.ink};margin:0 0 12px;">You're seeing ${dealsShown} deals. Unlock ${dealsLocked} more.</h3>
          <p style="font-family:'Barlow',Arial,sans-serif;font-size:14px;color:${C.ink70};line-height:1.6;margin:0 0 20px;">Upgrade to access all categories, custom discount thresholds, and flexible send days.</p>
          <a href="${appUrl}/upgrade" style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;background:${C.ink};color:${C.paper};text-decoration:none;padding:14px 32px;display:inline-block;">Upgrade Now</a>
        </div>
      </td>
    </tr>` : ''}

    <!-- ── CATEGORY SPACER ── -->
    <tr><td style="height:40px;"></td></tr>

    <!-- ── FOOTER ── -->
    <tr>
      <td class="hpad" style="background-color:${C.ink};padding:32px 48px;border-top:2px solid ${C.ink};">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <!-- Logo row -->
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
                  <td style="vertical-align:middle;">
                    <span style="font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;font-weight:300;letter-spacing:0.08em;color:${C.paper};">DOSSIER</span>
                  </td>
                </tr>
              </table>
            </td>
            <td style="vertical-align:middle;text-align:right;">
              <a href="${archiveUrl}" style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${C.footer55};text-decoration:none;margin-left:20px;">Archive</a>
              <a href="${preferencesUrl}" style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${C.footer55};text-decoration:none;margin-left:20px;">Preferences</a>
              <a href="${unsubscribeUrl}" style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${C.footer55};text-decoration:none;margin-left:20px;">Unsubscribe</a>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td colspan="2" style="padding-top:20px;">
              <div style="height:1px;background-color:${C.footer25};margin-bottom:16px;"></div>
              <p style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.12em;color:${C.footer45};line-height:1.7;margin:0;">
                You are receiving this because you subscribed to Dossier Weekly. Deals are curated editorially and may include affiliate relationships. Pricing and availability subject to change without notice. Prices confirmed at time of publication.<br><br>
                DOSSIER Weekly
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>

</td></tr>
</table>
</body>
</html>`
}
