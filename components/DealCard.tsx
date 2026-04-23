import type { Deal } from '@/types'
import { getDealLink, formatExpiryDate, formatSavings } from '@/lib/deals'

interface DealCardProps {
  deal: Deal
}

export function DealCard({ deal }: DealCardProps) {
  const link = getDealLink(deal)
  const expiry = formatExpiryDate(deal.expiration_date)
  const savings = formatSavings(deal)

  return (
    <div
      style={{
        padding: '24px 0',
        borderBottom: '1px solid oklch(94% 0.005 280)',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 16,
        alignItems: 'start',
      }}
    >
      <div>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'oklch(9% 0.010 280)',
            textDecoration: 'none',
            display: 'block',
            marginBottom: 6,
          }}
        >
          {deal.retailer}
        </a>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            color: 'oklch(35% 0.010 280)',
            lineHeight: 1.55,
            margin: '0 0 10px',
          }}
        >
          {deal.description}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {deal.promo_code && (
            <span
              style={{
                fontFamily: 'var(--font-condensed)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                border: '1.5px solid oklch(9% 0.010 280)',
                padding: '3px 10px',
              }}
            >
              {deal.promo_code}
            </span>
          )}
          {expiry && (
            <span
              style={{
                fontFamily: 'var(--font-condensed)',
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'oklch(62% 0.010 280)',
              }}
            >
              Ends {expiry}
            </span>
          )}
          {deal.source_email_link && (
            <a
              href={deal.source_email_link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'var(--font-condensed)',
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'oklch(62% 0.010 280)',
                textDecoration: 'none',
                borderBottom: '1px solid oklch(80% 0.005 280)',
              }}
            >
              View original email →
            </a>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 28,
            fontWeight: 300,
            lineHeight: 1,
            color: 'oklch(9% 0.010 280)',
          }}
        >
          {savings}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-condensed)',
            fontSize: 9,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'oklch(62% 0.010 280)',
            marginTop: 2,
          }}
        >
          Off
        </div>
      </div>
    </div>
  )
}
