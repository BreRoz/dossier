import { format, parseISO } from 'date-fns'
import type { Deal, Subscriber, Edition, Category } from '@/types'
import { CATEGORY_LABELS, ALL_CATEGORIES } from '@/types'
import { formatExpiryDate, rankDeals } from './deals'

// ── Brand palette (literal hex / rgba — CSS vars don't work in mail) ──────
const C = {
  bone:         '#F5F3EF',
  bone2:        '#EDEBE5',
  ink:          '#0E0E0E',
  oliveDeep:    '#6E8849',
  olive:        '#8BA661',
  // Alpha-on-bone for text + rules
  ink70:        'rgba(14,14,14,0.70)',
  ink55:        'rgba(14,14,14,0.55)',
  ink40:        'rgba(14,14,14,0.42)',
  ink25:        'rgba(14,14,14,0.25)',
  ink15:        'rgba(14,14,14,0.15)',
  ink08:        'rgba(14,14,14,0.08)',
  // Alpha-on-ink for the black bar text
  paperOnInk:   'rgba(245,243,239,0.92)',
  paperOnInk55: 'rgba(245,243,239,0.55)',
  paperOnInk25: 'rgba(245,243,239,0.25)',
} as const

// ── Font stacks (web font with system fallbacks for Outlook / Gmail) ──────
const FONT_DISPLAY = "'Fraunces','Cormorant Garamond',Georgia,serif"
const FONT_BODY = "'Inter',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif"
const FONT_MONO = "'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace"

// ── Retailer link resolution (unchanged from prior version) ───────────────
function normalizeForLookup(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function getRetailerLink(
  retailer: string,
  deal: Deal,
  storeUrls: Record<string, string>
): string {
  const exact = storeUrls[retailer.toLowerCase()]
  if (exact) return exact

  const norm = normalizeForLookup(retailer)
  const normMatch = storeUrls[norm]
  if (normMatch) return normMatch

  const keys = Object.keys(storeUrls)

  const prefix = keys.find((k) => norm.startsWith(k) || k.startsWith(norm))
  if (prefix) return storeUrls[prefix]

  const contained = keys.find((k) => k.length >= 4 && norm.includes(k))
  if (contained) return storeUrls[contained]

  const words = retailer.split(/\s+/)
  for (const word of words) {
    const wNorm = normalizeForLookup(word)
    if (wNorm.length >= 4) {
      const wordMatch =
        storeUrls[wNorm] || keys.find((k) => wNorm.startsWith(k) || k.startsWith(wNorm))
      if (wordMatch) return storeUrls[wordMatch] ?? storeUrls[wNorm]
    }
  }

  if (deal.original_link && !deal.original_link.includes('google.com/search'))
    return deal.original_link

  return `https://www.google.com/search?q=${encodeURIComponent(retailer)}`
}

// ── Highlight value phrases inside deal copy in olive ─────────────────────
function highlightDeal(text: string): string {
  const wrap = (m: string) =>
    `<strong style="font-weight:600;color:${C.oliveDeep};">${m}</strong>`

  // Honor any pre-existing <em> markup
  let out = text.replace(/<em>(.*?)<\/em>/gi, (_, inner) => wrap(inner))
  if (out !== text) return out

  return out
    .replace(/\bup to \d+%\s*off\b/gi, wrap)
    .replace(/\b\d+[-–]\d+%\s*off\b/gi, wrap)
    .replace(/\b\d+%\s*(?:off|discount)\b/gi, wrap)
    .replace(/\bdiscount of \d+%\b/gi, wrap)
    .replace(/\bfree (?:standard |express |2-day |overnight )?(?:shipping|delivery)\b/gi, wrap)
    .replace(/\bbuy\s+\d+,?\s+get\s+\d+\s+free\b/gi, wrap)
    .replace(/\bbuy (?:one|1),? get (?:one|1)(?: free| half[- ]off)?\b/gi, wrap)
    .replace(/\bBOGO\b/g, wrap)
    .replace(/\$\d+(?:\.\d+)?(?:\s*off| reward)\b/gi, wrap)
    .replace(/\bsaving \d+%\b/gi, wrap)
    .replace(/\bsaving \$\d+(?:\.\d+)?\b/gi, wrap)
    .replace(/\bfree item\b/gi, wrap)
    .replace(/\bget\s+(?:\d+|(?:[\w'.-]+\s+)*[\w'.-]+)\s+free\b/gi, wrap)
}

// External-link icon (kept for source-email indicators)
const EXT_ICON = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" style="display:inline-block;vertical-align:middle;"><path d="M4 4h6v2H6v12h12v-4h2v6H4z"/><path d="M14 4h6v6h-2V7.414l-8.293 8.293-1.414-1.414L16.586 6H14z"/></svg>`

// Brand mark — two opposite quadrants, paired hairline cross
function brandMark(size: number, color: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
  <rect x="1" y="1" width="20" height="20" stroke="${color}" stroke-width="1"/>
  <rect x="1" y="1" width="10" height="10" fill="${color}"/>
  <rect x="11" y="11" width="10" height="10" fill="${color}"/>
  <line x1="1" y1="11" x2="21" y2="11" stroke="${color}" stroke-width="0.5" opacity="0.4"/>
  <line x1="11" y1="1" x2="11" y2="21" stroke="${color}" stroke-width="0.5" opacity="0.4"/>
</svg>`
}

// ── Single deal entry within a store block (description / expiry / code) ──
// Note: the retailer name is owned by the parent storeBlock, not repeated here.
function dealEntry(deal: Deal, isLast: boolean): string {
  const expiry = formatExpiryDate(deal.expiration_date)
  const description = highlightDeal(deal.description)

  return `
<tr>
  <td style="padding:8px 0 ${isLast ? 0 : 12}px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="vertical-align:top;">
          <p style="font-family:${FONT_BODY};font-size:14px;line-height:1.55;color:${C.ink70};margin:0;">${description}</p>
          ${expiry ? `<div style="font-family:${FONT_BODY};font-size:9.5px;font-weight:500;letter-spacing:0.20em;text-transform:uppercase;color:${C.ink40};margin-top:6px;">Ends ${expiry}</div>` : ''}
        </td>
        ${deal.promo_code ? `<td style="vertical-align:top;text-align:right;padding-left:16px;white-space:nowrap;width:1%;"><span style="font-family:${FONT_MONO};font-size:10.5px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;border:1.5px solid ${C.ink};padding:6px 10px;color:${C.ink};display:inline-block;">${deal.promo_code}</span></td>` : ''}
      </tr>
    </table>
  </td>
</tr>`
}

// ── Store block (retailer name + optional source link + grouped deals) ───
// Retailers with multiple deals get one header; deals stack underneath.
function storeBlock(
  retailer: string,
  deals: Deal[],
  storeUrls: Record<string, string>,
  isLast: boolean
): string {
  const link = getRetailerLink(retailer, deals[0], storeUrls)
  // Pick the first deal that has a source_email_link to represent the retailer
  const sourceLink = deals.find((d) => d.source_email_link)?.source_email_link

  return `
<tr>
  <td style="padding:18px 0 ${isLast ? 4 : 18}px;${isLast ? '' : `border-bottom:1px solid ${C.ink15};`}">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="vertical-align:middle;">
          <a href="${link}" style="font-family:${FONT_DISPLAY};font-size:22px;font-style:italic;font-weight:400;letter-spacing:-0.01em;color:${C.ink};text-decoration:none;">${retailer}</a>
        </td>
        ${sourceLink ? `<td style="vertical-align:middle;text-align:right;white-space:nowrap;padding-left:16px;"><a href="${sourceLink}" style="font-family:${FONT_BODY};font-size:9.5px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:${C.oliveDeep};text-decoration:none;">${EXT_ICON}&nbsp;Original Email</a></td>` : ''}
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:8px;">
      ${deals.map((d, i) => dealEntry(d, i === deals.length - 1)).join('')}
    </table>
  </td>
</tr>`
}

// ── Category section (olive eyebrow + hairline + store blocks) ────────────
function categorySection(
  category: Category,
  deals: Deal[],
  storeUrls: Record<string, string>
): string {
  const label = CATEGORY_LABELS[category]
  const ranked = rankDeals(deals)

  // Group by retailer, preserving rank order — first appearance wins position
  const groups = new Map<string, Deal[]>()
  for (const deal of ranked) {
    if (!groups.has(deal.retailer)) groups.set(deal.retailer, [])
    groups.get(deal.retailer)!.push(deal)
  }
  const groupEntries = Array.from(groups.entries())

  return `
<tr>
  <td style="padding:32px 32px 8px;">
    <div style="padding-bottom:14px;border-bottom:1px solid ${C.ink15};margin-bottom:4px;">
      <span style="font-family:${FONT_BODY};font-size:11px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:${C.oliveDeep};">${label}</span>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      ${groupEntries.map(([retailer, rDeals], i) => storeBlock(retailer, rDeals, storeUrls, i === groupEntries.length - 1)).join('')}
    </table>
  </td>
</tr>`
}

// ── Subscriber settings summary line under hero ───────────────────────────
function buildSettingsSummary(
  subscriber: Subscriber,
  enabledCategories: Category[]
): string {
  const minPct =
    subscriber.tier === 'free' ? 40 : subscriber.min_discount ?? 20
  const cats =
    enabledCategories.length > 0
      ? enabledCategories
          .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
          .join(', ')
      : 'All categories'
  return `Showing ${minPct}%+ deals in ${cats}.`
}

// ── Main export ────────────────────────────────────────────────────────────
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
  const {
    subscriber,
    deals,
    edition,
    enabledCategories,
    totalDeals,
    appUrl,
    storeUrls = {},
  } = opts

  const weekOf = parseISO(edition.week_of)
  const weekStart = format(weekOf, 'MMM d')
  // Week ends 6 days after the Thursday anchor
  const weekEnd = format(
    new Date(weekOf.getTime() + 6 * 24 * 60 * 60 * 1000),
    'MMM d'
  )
  const issueNum = edition.issue_number
    ? `Issue No. ${edition.issue_number}`
    : 'Weekly Edition'
  const issueDate = format(weekOf, 'MMMM d, yyyy')
  const yearStr = format(weekOf, 'yyyy')

  // Assign each retailer to exactly one category (the one with the most of
  // their deals) so a single retailer doesn't appear under every category
  // they're tagged with.
  const byCategory: Partial<Record<Category, Deal[]>> = {}

  const byRetailer = new Map<string, Deal[]>()
  for (const deal of deals) {
    if (!byRetailer.has(deal.retailer)) byRetailer.set(deal.retailer, [])
    byRetailer.get(deal.retailer)!.push(deal)
  }

  for (const [, retailerDeals] of byRetailer) {
    const catCounts: Partial<Record<Category, number>> = {}
    for (const deal of retailerDeals) {
      for (const cat of deal.categories) {
        if (enabledCategories.includes(cat as Category)) {
          catCounts[cat as Category] = (catCounts[cat as Category] ?? 0) + 1
        }
      }
    }
    if (Object.keys(catCounts).length === 0) continue

    const primaryCat = ALL_CATEGORIES.find(
      (c) => catCounts[c] === Math.max(...(Object.values(catCounts) as number[]))
    )!

    if (!byCategory[primaryCat]) byCategory[primaryCat] = []
    const seen = new Set<string>()
    for (const deal of retailerDeals) {
      if (!seen.has(deal.id)) {
        seen.add(deal.id)
        byCategory[primaryCat]!.push(deal)
      }
    }
  }

  const orderedCategories = ALL_CATEGORIES.filter(
    (c) => byCategory[c] && byCategory[c]!.length > 0
  )

  const dealsShown = deals.length
  const dealsLocked = Math.max(0, totalDeals - dealsShown)

  const emailsScanned = edition.emails_scanned ?? 0
  const settingsSummary = buildSettingsSummary(subscriber, enabledCategories)

  const preferencesUrl = `${appUrl}/preferences`
  const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(
    subscriber.email
  )}`
  const archiveUrl = `${appUrl}/archive`
  const storesUrl = `${appUrl}/stores`

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Deal Dossier — ${issueDate}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<!--[if mso]><style>* { font-family: Georgia, serif !important; }</style><![endif]-->
<style>
  body { margin:0; padding:0; background-color:${C.bone2}; }
  a { color: inherit; }
  @media only screen and (max-width:600px) {
    .wrap   { padding: 0 0 60px !important; }
    .hpad   { padding-left: 24px !important; padding-right: 24px !important; }
    .barhpad { padding-left: 24px !important; padding-right: 24px !important; }
    .htitle { font-size: 36px !important; }
    .stat-num { font-size: 36px !important; }
    .barcell { display: block !important; width: 100% !important; text-align: left !important; padding: 4px 0 !important; }
    .footrow td { display: block !important; width: 100% !important; text-align: left !important; padding: 4px 0 !important; }
    .footlinks a { display: inline-block !important; margin: 0 18px 0 0 !important; }
    .statcell { display: block !important; width: 100% !important; }
    .statcell-r { border-right: none !important; border-bottom: 1px solid ${C.ink15} !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${C.bone2};-webkit-font-smoothing:antialiased;">

<!-- Outer wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" class="wrap" style="background-color:${C.bone2};padding:32px 16px 80px;">
<tr><td align="center">

  <table width="680" cellpadding="0" cellspacing="0" role="presentation" style="max-width:680px;width:100%;background-color:${C.bone};border:1px solid ${C.ink15};">

    <!-- ── HEADER ── -->
    <tr>
      <td class="hpad" style="padding:24px 32px;border-bottom:1px solid ${C.ink15};">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="vertical-align:middle;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">${brandMark(22, C.ink)}</td>
                  <td style="vertical-align:middle;">
                    <span style="font-family:${FONT_DISPLAY};font-size:22px;font-style:italic;font-weight:400;letter-spacing:-0.01em;color:${C.ink};">Deal Dossier</span>
                  </td>
                </tr>
              </table>
            </td>
            <td style="vertical-align:middle;text-align:right;">
              <div style="font-family:${FONT_BODY};font-size:10.5px;letter-spacing:0.18em;text-transform:uppercase;font-weight:500;color:${C.ink55};line-height:1.6;">
                ${issueNum}&nbsp;&nbsp;·&nbsp;&nbsp;${issueDate}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── BLACK BAR ── -->
    <tr>
      <td style="background-color:${C.ink};padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td class="barhpad" style="padding:18px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td class="barcell" style="vertical-align:middle;font-family:${FONT_BODY};font-size:10.5px;letter-spacing:0.22em;text-transform:uppercase;font-weight:500;color:${C.olive};">This Week's Brief</td>
                  <td class="barcell" style="vertical-align:middle;text-align:center;font-family:${FONT_BODY};font-size:10.5px;letter-spacing:0.22em;text-transform:uppercase;font-weight:500;color:${C.bone};">Week of ${weekStart} – ${weekEnd}</td>
                  <td class="barcell" style="vertical-align:middle;text-align:right;font-family:${FONT_BODY};font-size:10.5px;letter-spacing:0.22em;text-transform:uppercase;font-weight:500;color:${C.paperOnInk55};">${yearStr}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── HERO ── -->
    <tr>
      <td class="hpad" style="padding:48px 32px 40px;border-bottom:1px solid ${C.ink15};">
        <h1 class="htitle" style="font-family:${FONT_DISPLAY};font-size:52px;font-weight:300;letter-spacing:-0.025em;line-height:1.05;color:${C.ink};margin:0 0 24px;">The <em style="font-style:italic;color:${C.oliveDeep};font-weight:300;">finest</em> deals,<br>curated.</h1>
        <p style="font-family:${FONT_BODY};font-size:11px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:${C.ink55};margin:0 0 16px;">Scanned, filtered &amp; delivered — only what's worth your attention.</p>
        <p style="font-family:${FONT_BODY};font-size:13px;color:${C.ink55};margin:0;line-height:1.55;">
          ${settingsSummary}
          &nbsp;<a href="${preferencesUrl}" style="color:${C.ink};text-decoration:none;border-bottom:1px solid ${C.ink25};">Adjust settings</a>
        </p>
      </td>
    </tr>

    <!-- ── STATS (2 cells — Emails Scanned + Deals For You) ── -->
    <tr>
      <td style="border-bottom:1px solid ${C.ink15};">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td class="statcell statcell-r" style="padding:32px;border-right:1px solid ${C.ink15};text-align:left;width:50%;">
              <div class="stat-num" style="font-family:${FONT_DISPLAY};font-size:48px;font-weight:300;font-style:italic;letter-spacing:-0.02em;line-height:1;color:${C.ink};">${emailsScanned}</div>
              <div style="font-family:${FONT_BODY};font-size:9.5px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:${C.ink55};line-height:1.4;margin-top:10px;">Emails<br>Scanned</div>
            </td>
            <td class="statcell" style="padding:32px;text-align:left;width:50%;">
              <div class="stat-num" style="font-family:${FONT_DISPLAY};font-size:48px;font-weight:300;font-style:italic;letter-spacing:-0.02em;line-height:1;color:${C.oliveDeep};">${dealsShown}</div>
              <div style="font-family:${FONT_BODY};font-size:9.5px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:${C.ink55};line-height:1.4;margin-top:10px;">Deals<br>For You</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── DEALS BY CATEGORY ── -->
    ${orderedCategories.map((cat) => categorySection(cat, byCategory[cat]!, storeUrls)).join('')}

    <!-- ── UPGRADE BLOCK (free tier only, only if deals locked) ── -->
    ${
      subscriber.tier === 'free' && dealsLocked > 0
        ? `
    <tr><td style="height:24px;"></td></tr>
    <tr>
      <td class="hpad" style="padding:0 32px 8px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${C.bone2};">
          <tr>
            <td style="padding:32px;">
              <p style="font-family:${FONT_BODY};font-size:11px;font-weight:500;letter-spacing:0.28em;text-transform:uppercase;color:${C.oliveDeep};margin:0 0 12px;">Unlock More</p>
              <h3 style="font-family:${FONT_DISPLAY};font-size:28px;font-weight:300;font-style:italic;letter-spacing:-0.02em;line-height:1.1;color:${C.ink};margin:0 0 14px;">You're seeing ${dealsShown} deals. Unlock <span style="color:${C.oliveDeep};">${dealsLocked} more.</span></h3>
              <p style="font-family:${FONT_BODY};font-size:14px;color:${C.ink70};line-height:1.6;margin:0 0 22px;">Upgrade to access all 13 categories, custom discount thresholds, and flexible send days.</p>
              <a href="${appUrl}/upgrade" style="font-family:${FONT_BODY};font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;background:${C.ink};color:${C.bone};text-decoration:none;padding:14px 28px;display:inline-block;">Upgrade Now</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
        : ''
    }

    <!-- ── STORE CONTROL NUDGE ── -->
    <tr>
      <td class="hpad" style="padding:32px;border-top:1px solid ${C.ink15};text-align:center;">
        <p style="font-family:${FONT_BODY};font-size:10.5px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:${C.ink55};margin:0;line-height:1.6;">
          Not every brand your thing? <a href="${storesUrl}" style="color:${C.ink};text-decoration:none;border-bottom:1px solid ${C.ink25};">Toggle stores on or off</a> with a paid account.
        </p>
      </td>
    </tr>

    <!-- ── FOOTER ── -->
    <tr>
      <td class="hpad" style="padding:32px;border-top:1px solid ${C.ink15};">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" class="footrow">
          <tr>
            <td style="vertical-align:middle;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">${brandMark(22, C.ink)}</td>
                  <td style="vertical-align:middle;">
                    <span style="font-family:${FONT_DISPLAY};font-size:22px;font-style:italic;font-weight:400;letter-spacing:-0.01em;color:${C.ink};">Deal Dossier</span>
                  </td>
                </tr>
              </table>
            </td>
            <td class="footlinks" style="vertical-align:middle;text-align:right;">
              <a href="${archiveUrl}" style="font-family:${FONT_BODY};font-size:10.5px;letter-spacing:0.22em;text-transform:uppercase;font-weight:500;color:${C.ink70};text-decoration:none;margin-left:24px;">Archive</a>
              <a href="${preferencesUrl}" style="font-family:${FONT_BODY};font-size:10.5px;letter-spacing:0.22em;text-transform:uppercase;font-weight:500;color:${C.ink70};text-decoration:none;margin-left:24px;">Preferences</a>
              <a href="${unsubscribeUrl}" style="font-family:${FONT_BODY};font-size:10.5px;letter-spacing:0.22em;text-transform:uppercase;font-weight:500;color:${C.ink70};text-decoration:none;margin-left:24px;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Fine print -->
    <tr>
      <td class="hpad" style="padding:0 32px 32px;">
        <p style="font-family:${FONT_BODY};font-size:11.5px;color:${C.ink40};line-height:1.6;margin:0;">
          You are receiving this because you subscribed to Deal Dossier. Deals are curated editorially and may include affiliate relationships. Pricing and availability subject to change without notice.
        </p>
      </td>
    </tr>

  </table>

</td></tr>
</table>
</body>
</html>`
}
