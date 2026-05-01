'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Nav() {
  const pathname = usePathname()

  const links = [
    { label: 'HOME',     href: '/' },
    { label: 'ARCHIVE',  href: '/archive' },
    { label: 'STORES',   href: '/stores' },
    { label: 'SETTINGS', href: '/preferences' },
  ]

  const linkStyle = (href: string): React.CSSProperties => ({
    fontFamily: 'var(--font-condensed)',
    fontSize: 10,
    letterSpacing: '0.22em',
    textDecoration: 'none',
    color: 'var(--ink)',
    borderBottom: pathname === href ? '1px solid var(--ink)' : 'none',
    paddingBottom: pathname === href ? 2 : 0,
    whiteSpace: 'nowrap' as const,
  })

  return (
    <>
      <style>{`
        .site-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 40px;
          border-bottom: 1px solid rgba(10,10,10,0.12);
          background: var(--paper);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        @media (max-width: 900px) {
          .site-nav { padding: 18px 28px; }
        }
        @media (max-width: 540px) {
          .site-nav { padding: 16px 16px; }
          .site-nav a { font-size: 9px !important; letter-spacing: 0.12em !important; }
        }
      `}</style>
      <nav className="site-nav">
        {links.map(({ label, href }) => (
          <Link key={label} href={href} style={linkStyle(href)}>{label}</Link>
        ))}
      </nav>
    </>
  )
}
