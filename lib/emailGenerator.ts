import { format, parseISO } from 'date-fns'
import type { Deal, Subscriber, Edition, Category } from '@/types'
import { CATEGORY_LABELS, ALL_CATEGORIES } from '@/types'
import { formatExpiryDate, rankDeals } from './deals'
// Note: formatSavings not used — discount info lives in the description text

// ── Seasonal accent colors (hex) ──────────────────────────────────────────────
function getCurrentAccent(): string {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return '#C2522B'  // spring — terracotta
  if (month >= 6 && month <= 8) return '#2E5FC4'  // summer — blue
  if (month >= 9 && month <= 11) return '#C97A28' // fall — amber
  return '#1A7A5A'                                 // winter — teal
}

// ── Palette (hex equivalents of the reference's oklch values) ─────────────────
const C = {
  ink:      '#0D0D0F',  // oklch(9% 0.010 280)
  ink70:    '#4C4A52',  // oklch(35% 0.010 280)
  ink40:    '#929099',  // oklch(62% 0.010 280)
  ink15:    '#D5D4D9',  // oklch(85% 0.008 280)
  ink06:    '#EEEDEE',  // oklch(94% 0.005 280)
  paper:    '#F8F6F2',  // oklch(98% 0.004 90)
  bg:       '#DDDCE1',  // oklch(88% 0.006 280)
  sub:      '#999899',  // oklch(60% 0.005 280) — hero sub text
  footer22: '#312F38',  // oklch(22% 0.01 280)  — footer divider
  footer50: '#706E76',  // oklch(50% 0.01 280)  — footer links
  footer40: '#5C5A62',  // oklch(40% 0.01 280)  — footer fine print
}

// ── Category symbols (Unicode — renders in all email clients; SVGs stripped by Gmail) ──
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

// Get best link for a deal
function getRetailerLink(retailer: string, deal: Deal, storeUrls: Record<string, string>): string {
  return storeUrls[retailer.toLowerCase()]
    || (deal.original_link && !deal.original_link.includes('google.com/search') ? deal.original_link : null)
    || `https://www.google.com/search?q=${encodeURIComponent(retailer)}`
}

// ── Single deal row ───────────────────────────────────────────────────────────
function dealRow(deal: Deal): string {
  const expiry = formatExpiryDate(deal.expiration_date)

  return `
<tr>
  <td style="padding:4px 0 2px;">
    <p style="font-family:'Barlow',Arial,sans-serif;font-size:13px;color:${C.ink70};line-height:1.45;margin:0 0 5px;">${deal.description}</p>
    ${deal.promo_code || expiry ? `
    <table cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        ${deal.promo_code ? `<td style="padding-right:10px;vertical-align:middle;"><span style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;border:1.5px solid ${C.ink};padding:2px 8px;color:${C.ink};display:inline-block;">${deal.promo_code}</span></td>` : ''}
        ${expiry ? `<td style="vertical-align:middle;"><span style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:${C.ink40};">Ends ${expiry}</span></td>` : ''}
      </tr>
    </table>` : ''}
  </td>
</tr>`
}

// External link icon (inline SVG — small enough that even Gmail fallback is fine)
const EXT_ICON = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" style="display:inline-block;vertical-align:middle;"><path d="M4 4h6v2H6v12h12v-4h2v6H4z"/><path d="M14 4h6v6h-2V7.414l-8.293 8.293-1.414-1.414L16.586 6H14z"/></svg>`

// ── Store block (retailer name + optional source link + deal rows) ─────────────
function storeBlock(
  retailer: string,
  deals: Deal[],
  storeUrls: Record<string, string>
): string {
  const link = getRetailerLink(retailer, deals[0], storeUrls)
  const sourceLink = deals[0]?.source_email_link

  return `
<tr>
  <td style="padding:12px 0 0;">
    <a href="${link}" style="font-family:'Barlow',Arial,sans-serif;font-size:14px;font-weight:600;letter-spacing:-0.01em;color:${C.ink};text-decoration:none;display:block;margin-bottom:${sourceLink ? '2px' : '8px'};">${retailer}</a>
    ${sourceLink ? `<a href="${sourceLink}" style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:${C.ink40};text-decoration:none;display:block;margin-bottom:8px;">${EXT_ICON}&nbsp;Original email</a>` : ''}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      ${deals.map(d => dealRow(d)).join('')}
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
<tr><td style="height:8px;"></td></tr>

<!-- Category header -->
<tr>
  <td style="padding:20px 40px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="vertical-align:middle;white-space:nowrap;padding-right:12px;">
          <span style="font-size:13px;color:${accent};">${symbol}</span>&nbsp;<span style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:${accent};">${label}</span>
        </td>
        <td style="vertical-align:middle;width:100%;">
          <div style="height:1px;background:${C.ink15};"></div>
        </td>
      </tr>
    </table>
  </td>
</tr>

<!-- Store blocks -->
<tr>
  <td style="padding:0 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      ${groupEntries.map(([retailer, rDeals]) => storeBlock(retailer, rDeals, storeUrls)).join('')}
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

  const weekOf = parseISO(edition.week_of)
  const weekStart = format(weekOf, 'MMM d')
  // week ends 6 days after the Thursday anchor
  const weekEnd = format(new Date(weekOf.getTime() + 6 * 24 * 60 * 60 * 1000), 'MMM d')
  const issueNum = edition.issue_number ? `Issue No. ${edition.issue_number}` : 'Weekly Edition'
  const issueDate = format(weekOf, 'MMMM d, yyyy')

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

  const emailsScanned = edition.emails_scanned ?? '—'
  const dealsFound = edition.deals_found ?? '—'
  const storesCovered = edition.retailers_count ?? '—'

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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;600&display=swap" rel="stylesheet">
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  body { margin:0; padding:0; background-color:${C.bg}; }
  @media only screen and (max-width:600px) {
    .wrap   { padding: 0 0 60px !important; }
    .hpad   { padding-left: 20px !important; padding-right: 20px !important; }
    .herorow td { display: block !important; width: 100% !important; padding: 0 !important; }
    .herodate { text-align: left !important; margin-top: 8px !important; }
    .htitle { font-size: 28px !important; }
    .statcell { display: block !important; width: 50% !important; float: left !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" class="wrap" style="background-color:${C.bg};padding:32px 16px 80px;">
<tr><td align="center">

  <table width="680" cellpadding="0" cellspacing="0" role="presentation" style="max-width:680px;width:100%;background-color:${C.paper};">

    <!-- ── HEADER ── -->
    <tr>
      <td class="hpad" style="padding:24px 40px 20px;border-bottom:1px solid ${C.ink15};">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="vertical-align:middle;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="vertical-align:middle;padding-right:9px;">
                    <svg width="24" height="24" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="1" y="1" width="42" height="42" stroke="${C.ink}" stroke-width="1.5"/>
                      <rect x="1" y="1" width="20" height="20" fill="${C.ink}"/>
                      <rect x="23" y="23" width="20" height="20" fill="${C.ink}"/>
                      <line x1="22" y1="1" x2="22" y2="43" stroke="${C.ink}" stroke-width="1.5"/>
                      <line x1="1" y1="22" x2="43" y2="22" stroke="${C.ink}" stroke-width="1.5"/>
                    </svg>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;font-weight:300;letter-spacing:0.08em;color:${C.ink};">DOSSIER</span>
                  </td>
                </tr>
              </table>
            </td>
            <td style="vertical-align:middle;text-align:right;">
              <div style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${C.ink40};line-height:1.8;">
                ${issueNum}<br>${issueDate}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── HERO (compact, split layout) ── -->
    <tr>
      <td class="hpad" style="background-color:${C.ink};padding:28px 40px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" class="herorow">
          <tr>
            <td style="vertical-align:bottom;">
              <p style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:${accent};margin:0 0 8px;">This Week's Brief</p>
              <h1 class="htitle" style="font-family:'Cormorant Garamond',Georgia,serif;font-size:36px;font-weight:300;letter-spacing:-0.02em;line-height:1.0;color:${C.paper};margin:0 0 8px;">The <em style="font-style:italic;">finest</em> deals,<br>curated.</h1>
              <p style="font-family:'Barlow',Arial,sans-serif;font-size:12px;color:${C.sub};line-height:1.5;margin:0;">Scanned, filtered, and delivered. Only what's worth your attention.</p>
            </td>
            <td class="herodate" style="vertical-align:bottom;text-align:right;padding-left:24px;white-space:nowrap;">
              <div style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#636069;line-height:1.8;">
                Week of<br>${weekStart} – ${weekEnd}<br>${format(weekOf, 'yyyy')}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── STATS BAR (4 cells) ── -->
    <tr>
      <td style="border-bottom:1px solid ${C.ink15};">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td class="statcell" style="padding:16px 0;border-right:1px solid ${C.ink15};text-align:center;width:25%;">
              <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:300;letter-spacing:-0.02em;line-height:1;color:${C.ink};">${emailsScanned}</div>
              <div style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${C.ink40};line-height:1.3;margin-top:3px;">Emails<br>Scanned</div>
            </td>
            <td class="statcell" style="padding:16px 0;border-right:1px solid ${C.ink15};text-align:center;width:25%;">
              <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:300;letter-spacing:-0.02em;line-height:1;color:${C.ink};">${dealsFound}</div>
              <div style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${C.ink40};line-height:1.3;margin-top:3px;">Deals<br>Found</div>
            </td>
            <td class="statcell" style="padding:16px 0;border-right:1px solid ${C.ink15};text-align:center;width:25%;">
              <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:300;letter-spacing:-0.02em;line-height:1;color:${C.ink};">${storesCovered}</div>
              <div style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${C.ink40};line-height:1.3;margin-top:3px;">Stores<br>Covered</div>
            </td>
            <td class="statcell" style="padding:16px 0;text-align:center;width:25%;">
              <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:300;letter-spacing:-0.02em;line-height:1;color:${accent};">${dealsShown}</div>
              <div style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${C.ink40};line-height:1.3;margin-top:3px;">Your<br>Deals</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── DEALS BY CATEGORY ── -->
    ${orderedCategories.map((cat) => categorySection(cat, byCategory[cat]!, accent, storeUrls)).join('')}

    <!-- ── UPGRADE BLOCK (free tier only) ── -->
    ${subscriber.tier === 'free' && dealsLocked > 0 ? `
    <tr><td style="height:32px;"></td></tr>
    <tr>
      <td class="hpad" style="padding:0 40px 40px;">
        <div style="background-color:${C.ink06};padding:28px;">
          <p style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:${accent};margin:0 0 8px;">Unlock More</p>
          <h3 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;font-weight:300;color:${C.ink};margin:0 0 10px;">You're seeing ${dealsShown} deals. Unlock ${dealsLocked} more.</h3>
          <p style="font-family:'Barlow',Arial,sans-serif;font-size:13px;color:${C.ink70};line-height:1.6;margin:0 0 18px;">Upgrade to access all categories, custom discount thresholds, and flexible send days.</p>
          <a href="${appUrl}/upgrade" style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;background:${C.ink};color:${C.paper};text-decoration:none;padding:12px 28px;display:inline-block;">Upgrade Now</a>
        </div>
      </td>
    </tr>` : ''}

    <!-- Category spacer before footer -->
    <tr><td style="height:8px;"></td></tr>

    <!-- ── FOOTER ── -->
    <tr>
      <td class="hpad" style="background-color:${C.ink};padding:24px 40px;border-top:2px solid ${C.ink};">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <!-- Logo + links row -->
          <tr>
            <td style="vertical-align:middle;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="vertical-align:middle;padding-right:9px;">
                    <svg width="18" height="18" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="1" y="1" width="42" height="42" stroke="#F7F6F3" stroke-width="1.5"/>
                      <rect x="1" y="1" width="20" height="20" fill="#F7F6F3"/>
                      <rect x="23" y="23" width="20" height="20" fill="#F7F6F3"/>
                      <line x1="22" y1="1" x2="22" y2="43" stroke="#F7F6F3" stroke-width="1.5"/>
                      <line x1="1" y1="22" x2="43" y2="22" stroke="#F7F6F3" stroke-width="1.5"/>
                    </svg>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:300;letter-spacing:0.08em;color:${C.paper};">DOSSIER</span>
                  </td>
                </tr>
              </table>
            </td>
            <td style="vertical-align:middle;text-align:right;">
              <a href="${archiveUrl}" style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${C.footer50};text-decoration:none;margin-left:20px;">Archive</a>
              <a href="${preferencesUrl}" style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${C.footer50};text-decoration:none;margin-left:20px;">Preferences</a>
              <a href="${unsubscribeUrl}" style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${C.footer50};text-decoration:none;margin-left:20px;">Unsubscribe</a>
            </td>
          </tr>
          <!-- Divider + fine print -->
          <tr>
            <td colspan="2" style="padding-top:16px;">
              <div style="height:1px;background-color:${C.footer22};margin-bottom:16px;"></div>
              <p style="font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;font-size:10px;letter-spacing:0.10em;color:${C.footer40};line-height:1.7;margin:0;">
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

