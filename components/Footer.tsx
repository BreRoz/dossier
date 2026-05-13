import Link from 'next/link'

function DossierMark({ size = 16 }: { size?: number }) {
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

export function Footer() {
  return (
    <>
      <style>{`
        .site-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 36px 56px;
          border-top: 1px solid var(--ink-15);
          background: var(--paper);
          gap: 24px;
          flex-wrap: wrap;
        }
        .site-footer-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .site-footer-brand svg { display: block; color: var(--ink); }
        .site-footer-brand span {
          font-family: var(--font-condensed);
          font-size: 10.5px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-weight: 500;
          color: var(--ink-70);
        }
        .site-footer-links {
          display: flex;
          gap: 32px;
        }
        .site-footer-link {
          font-family: var(--font-condensed);
          font-size: 10.5px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-weight: 500;
          color: var(--ink);
          text-decoration: none;
          opacity: 0.65;
          transition: opacity .3s var(--easing), color .3s var(--easing);
        }
        .site-footer-link:hover {
          opacity: 1;
          color: var(--olive-deep);
        }
        .site-footer-copy {
          font-family: var(--font-condensed);
          font-size: 10.5px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          font-weight: 500;
          color: var(--ink-40);
        }
        .site-footer-copy-link {
          color: inherit;
          text-decoration: none;
          border-bottom: 1px solid currentColor;
          transition: color .3s var(--easing);
        }
        .site-footer-copy-link:hover { color: var(--olive-deep); }
        @media (max-width: 900px) {
          .site-footer { padding: 32px 24px; }
          .site-footer-links { gap: 24px; }
        }
        @media (max-width: 540px) {
          .site-footer {
            flex-direction: column;
            align-items: flex-start;
            padding: 28px 20px;
            gap: 20px;
          }
        }
      `}</style>
      <footer className="site-footer">
        <div className="site-footer-brand">
          <DossierMark size={16} />
          <span>Deal Dossier · Tell Us What You’re Shopping For</span>
        </div>
        <div className="site-footer-links">
          <Link href="/archive" className="site-footer-link">Archive</Link>
          <Link href="/privacy" className="site-footer-link">Privacy</Link>
        </div>
        <span className="site-footer-copy">
          An{' '}
          <a
            href="https://www.hoursand.co/"
            target="_blank"
            rel="noopener noreferrer"
            className="site-footer-copy-link"
          >
            Hours &amp; Co.
          </a>{' '}
          publication · © 2026
        </span>
      </footer>
    </>
  )
}
