'use client'

import Link from 'next/link'
import { DossierLogo } from './DossierLogo'

interface NavProps {
  showCta?: boolean
}

export function Nav({ showCta = true }: NavProps) {
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 60px',
        background: 'oklch(98% 0.004 90)',
        borderBottom: '1px solid oklch(85% 0.008 280)',
        zIndex: 100,
      }}
    >
      <Link href="/" style={{ textDecoration: 'none' }}>
        <DossierLogo size={22} wordmarkSize={18} />
      </Link>

      <ul
        style={{
          display: 'flex',
          gap: 32,
          listStyle: 'none',
          margin: '0 0 0 auto',
          padding: 0,
        }}
      >
        {[
          { label: 'Archive', href: '/archive' },
          { label: 'Stores', href: '/stores' },
          { label: 'About', href: '#how-it-works' },
        ].map(({ label, href }) => (
          <li key={label}>
            <Link
              href={href}
              style={{
                fontFamily: 'var(--font-condensed)',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'oklch(62% 0.010 280)',
                textDecoration: 'none',
              }}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>

      {showCta && (
        <Link
          href="/login"
          style={{
            marginLeft: 32,
            fontFamily: 'var(--font-condensed)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            background: 'oklch(9% 0.010 280)',
            color: 'oklch(98% 0.004 90)',
            border: 'none',
            padding: '10px 24px',
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Subscribe Free
        </Link>
      )}
    </nav>
  )
}
