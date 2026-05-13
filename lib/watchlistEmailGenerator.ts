// Watchlist email — generated on-demand when a subscriber refreshes their
// watchlist or first signs up. Distinct from the weekly digest (which is
// retailer-and-category-grouped); this email is organized by the user's
// watches: one section per "I'm shopping for X" entry.

import { format } from 'date-fns'
import type { Deal } from '@/types'

// ── Brand palette (literal hex / rgba — CSS vars don't work in mail) ──
const FONT_DISPLAY =
  "'Fraunces','Cormorant Garamond',Georgia,serif"
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

export interface WatchSection {
  label: string          // human-readable: "Bath & Towels", "Womens Clothes — jeans"
  deals: Deal[]
}

export interface WatchlistEmailInput {
  appUrl: string
  watchSections: WatchSection[]
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatSavings(deal: Deal): string {
  if (deal.deal_type === 'bogo-free') return 'BOGO'
  if (deal.deal_type === 'bogo-half') return 'BOGO 50%'
  if (deal.deal_type === 'free-item') return 'Free Item'
  if (deal.deal_type === 'free-shipping') return 'Free Shipping'
  if (deal.percent_off) {
    const prefix = deal.deal_type === 'up-to' ? 'Up to ' : ''
    return `${prefix}${deal.percent_off}%`
  }
  return 'Sale'
}

function dealRow(deal: Deal): string {
  const savings = escape(formatSavings(deal))
  const retailer = escape(deal.retailer)
  const description = escape(deal.description)
  const promoCode = deal.promo_code
    ? `<div style="font-family:${FONT_BODY};font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${OLIVE_DEEP};margin-top:8px;">Code: ${escape(deal.promo_code)}</div>`
    : ''
  const expiration = deal.expiration_date
    ? `<div style="font-family:${FONT_BODY};font-size:11px;color:${INK40};margin-top:4px;">Ends ${escape(deal.expiration_date)}</div>`
    : ''
  const link = deal.affiliate_link || deal.original_link

  return `
    <tr><td style="padding:16px 0;border-bottom:1px solid ${INK15};">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="vertical-align:top;padding-right:16px;">
            <a href="${escape(link)}" style="font-family:${FONT_DISPLAY};font-size:20px;font-style:italic;font-weight:400;letter-spacing:-0.01em;color:${INK};text-decoration:none;">${retailer}</a>
            <div style="font-family:${FONT_BODY};font-size:13.5px;color:${INK70};line-height:1.55;margin-top:6px;">${description}</div>
            ${promoCode}
            ${expiration}
          </td>
          <td style="vertical-align:top;text-align:right;white-space:nowrap;">
            <span style="font-family:${FONT_DISPLAY};font-size:22px;font-weight:300;font-style:italic;color:${OLIVE_DEEP};">${savings}</span>
          </td>
        </tr>
      </table>
    </td></tr>
  `
}

function section({ label, deals }: WatchSection): string {
  if (deals.length === 0) {
    return `
      <tr><td style="padding:32px 0 8px;">
        <h2 style="font-family:${FONT_DISPLAY};font-size:28px;font-weight:300;font-style:italic;letter-spacing:-0.02em;color:${INK};margin:0 0 12px;">${escape(label)}</h2>
        <p style="font-family:${FONT_BODY};font-size:13.5px;color:${INK55};line-height:1.55;margin:0;">Nothing fresh yet — we'll keep watching.</p>
      </td></tr>
    `
  }
  return `
    <tr><td style="padding:32px 0 0;">
      <h2 style="font-family:${FONT_DISPLAY};font-size:28px;font-weight:300;font-style:italic;letter-spacing:-0.02em;color:${INK};margin:0 0 8px;">${escape(label)}</h2>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        ${deals.map(dealRow).join('')}
      </table>
    </td></tr>
  `
}

export function generateWatchlistEmail({
  appUrl,
  watchSections,
}: WatchlistEmailInput): string {
  const today = format(new Date(), 'MMMM d, yyyy')
  const totalDeals = watchSections.reduce((sum, s) => sum + s.deals.length, 0)
  const preferencesUrl = `${appUrl}/preferences`

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Your watchlist deals · ${today}</title>
</head>
<body style="margin:0;padding:0;background-color:${BONE2};-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${BONE2};padding:40px 16px 60px;">
<tr><td align="center">

  <table width="640" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;width:100%;background-color:${BONE};border:1px solid ${INK15};">

    <!-- Header -->
    <tr><td style="padding:28px 40px;border-bottom:1px solid ${INK15};">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="vertical-align:middle;">
            <img src="${appUrl}/dealdossier-logo.png" alt="Deal Dossier" width="160" height="32" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />
          </td>
          <td style="vertical-align:middle;text-align:right;font-family:${FONT_BODY};font-size:10.5px;letter-spacing:0.18em;text-transform:uppercase;font-weight:500;color:${INK55};">
            ${escape(today)}
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Hero -->
    <tr><td style="padding:48px 40px 8px;">
      <p style="font-family:${FONT_BODY};font-size:11px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:${OLIVE_DEEP};margin:0 0 16px;">Your Watchlist</p>
      <h1 style="font-family:${FONT_DISPLAY};font-size:40px;font-weight:300;letter-spacing:-0.025em;line-height:1.05;color:${INK};margin:0 0 12px;">${totalDeals === 0 ? 'Still watching.' : `${totalDeals} ${totalDeals === 1 ? 'deal' : 'deals'} <em style="font-style:italic;color:${OLIVE_DEEP};font-weight:300;">for you.</em>`}</h1>
      <p style="font-family:${FONT_BODY};font-size:14.5px;color:${INK70};line-height:1.55;margin:0;">Here's what we're tracking for you right now. Click a deal to head straight to the retailer.</p>
    </td></tr>

    <!-- Sections -->
    <tr><td style="padding:0 40px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        ${watchSections.map(section).join('')}
      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:24px 40px;border-top:1px solid ${INK15};">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="vertical-align:middle;">
            <img src="${appUrl}/dealdossier-logo.png" alt="Deal Dossier" width="120" height="24" style="display:block;border:0;outline:none;text-decoration:none;" />
          </td>
          <td style="vertical-align:middle;text-align:right;">
            <a href="${preferencesUrl}" style="font-family:${FONT_BODY};font-size:10.5px;letter-spacing:0.22em;text-transform:uppercase;font-weight:500;color:${INK70};text-decoration:none;">Manage Watchlist</a>
          </td>
        </tr>
      </table>
    </td></tr>

  </table>

</td></tr>
</table>
</body></html>`
}
