'use client'

import { useState, useEffect } from 'react'
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
  const [open, setOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const baseLinks = [
    { label: 'Home', href: '/' },
    { label: 'Archive', href: '/archive' },
    { label: 'Stores', href: '/stores' },
    { label: 'Settings', href: '/preferences' },
  ]
  const adminLink = { label: 'Admin', href: '/admin' }
  const links = isAdmin ? [...baseLinks, adminLink] : baseLinks

  // Desktop nav drops "Home" since the logo already links there
  const desktopLinks = links.filter((l) => l.href !== '/')

  const isActive = (href: string) =>
    href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(href + '/')

  // Check whether the signed-in user is the configured admin (server-side check
  // via /api/admin/check so ADMIN_EMAIL never reaches the client bundle)
  useEffect(() => {
    fetch('/api/admin/check')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.isAdmin) setIsAdmin(true)
      })
      .catch(() => {})
  }, [pathname])

  // Close menu on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Lock body scroll when overlay is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

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
          gap: 16px;
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
          white-space: nowrap;
        }
        .site-nav-logo svg { display: block; color: var(--ink); flex-shrink: 0; }

        /* Desktop link list */
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

        /* Mobile hamburger toggle */
        .site-nav-toggle {
          display: none;
          background: none;
          border: none;
          color: var(--ink);
          padding: 8px;
          margin: -8px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .site-nav-toggle svg { display: block; }

        /* Mobile overlay menu */
        .site-nav-overlay {
          position: fixed;
          inset: 0;
          z-index: 45;
          background: var(--paper);
          padding: 96px 28px 48px;
          flex-direction: column;
          gap: 8px;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity .35s var(--easing), visibility .35s var(--easing);
          display: none;
        }
        .site-nav-overlay.open {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }
        .site-nav-overlay a {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 350;
          font-size: 36px;
          color: var(--ink);
          letter-spacing: -0.01em;
          text-decoration: none;
          padding: 18px 0;
          border-bottom: 1px solid var(--ink-15);
          transition: color .3s var(--easing);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .site-nav-overlay a.is-active {
          color: var(--olive-deep);
        }
        .site-nav-overlay a::after {
          content: '→';
          font-size: 22px;
          color: var(--ink-40);
          transition: transform .3s var(--easing), color .3s var(--easing);
        }
        .site-nav-overlay a.is-active::after {
          color: var(--olive-deep);
        }

        @media (max-width: 768px) {
          .site-nav-inner { padding: 14px 22px; }
          .site-nav-logo { font-size: 18px; }
          .site-nav-logo svg { width: 19px; height: 19px; }
          .site-nav-links { display: none; }
          .site-nav-toggle { display: block; }
          .site-nav-overlay { display: flex; }
        }
      `}</style>

      <nav className="site-nav">
        <div className="site-nav-inner">
          <Link href="/" className="site-nav-logo">
            <DossierMark size={22} />
            <span>Deal Dossier</span>
          </Link>

          <ul className="site-nav-links">
            {desktopLinks.map(({ label, href }) => (
              <li key={href}>
                <Link href={href} className={isActive(href) ? 'is-active' : ''}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="site-nav-toggle"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <line x1="4.5" y1="4.5" x2="17.5" y2="17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="17.5" y1="4.5" x2="4.5" y2="17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <line x1="3" y1="7" x2="19" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="3" y1="15" x2="19" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile overlay (rendered always; toggled with .open) */}
      <div className={`site-nav-overlay ${open ? 'open' : ''}`} role="dialog" aria-modal="true">
        {links.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className={isActive(href) ? 'is-active' : ''}
          >
            {label}
          </Link>
        ))}
      </div>
    </>
  )
}
