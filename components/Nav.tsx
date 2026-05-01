'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function DossierMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="20" height="20" stroke="currentColor" strokeWidth="1" />
      <rect x="1" y="1" width="10" height="10" fill="currentColor" />
      <rect x="11" y="11" width="10" height="10" fill="currentColor" />
      <line x1="1" y1="11" x2="21" y2="11" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <line x1="11" y1="1" x2="11" y2="21" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
    </svg>
  )
}

export function Nav() {
  const pathname = usePathname()

  const links = [
    { label: 'Archive', href: '/archive' },
    { label: 'Stores', href: '/stores' },
    { label: 'Settings', href: '/preferences' },
  ]

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      <style>{`
        .site-nav {
          position: sticky; top: 0; z-index: 50;
          background: var(--paper);
          border-bottom: 1px solid var(--ink-15);
          transition: background .4s var(--easing), border-color .4s var(--easing);
        }
        .site-nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 56px;
        }
        .site-nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 400;
          font-size: 21px;
          letter-spacing: -0.01em;
          color: var(--ink);
          text-decoration: none;
        }
        .site-nav-logo svg { display: block; color: var(--ink); }
        .site-nav-links {
          display: flex;
          gap: 32px;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .site-nav-links a {
          font-family: var(--font-condensed);
          font-size: 10.5px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-weight: 500;
          color: var(--ink);
          text-decoration: none;
          position: relative;
          padding: 4px 0;
          transition: color .3s var(--easing);
        }
        .site-nav-links a::after {
          content: '';
          position: absolute;
          left: 0; right: 0; bottom: 0;
          height: 1px;
          background: currentColor;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform .4s var(--easing);
        }
        .site-nav-links a:hover::after,
        .site-nav-links a.is-active::after {
          transform: scaleX(1);
        }
        .site-nav-links a.is-active::after {
          background: var(--olive-deep);
        }
        @media (max-width: 900px) {
          .site-nav-inner { padding: 16px 28px; }
          .site-nav-links { gap: 24px; }
        }
        @media (max-width: 540px) {
          .site-nav-inner { padding: 14px 18px; }
          .site-nav-logo { font-size: 17px; }
          .site-nav-logo svg { width: 18px; height: 18px; }
          .site-nav-links { gap: 14px; }
          .site-nav-links a { font-size: 9px; letter-spacing: 0.14em; }
        }
      `}</style>
      <nav className="site-nav">
        <div className="site-nav-inner">
          <Link href="/" className="site-nav-logo">
            <DossierMark size={22} />
            <span>Deal Dossier</span>
          </Link>
          <ul className="site-nav-links">
            {links.map(({ label, href }) => (
              <li key={href}>
                <Link href={href} className={isActive(href) ? 'is-active' : ''}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  )
}
