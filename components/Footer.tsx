import Link from 'next/link'

export function Footer() {
  return (
    <>
      <style>{`
        .site-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 40px;
          border-top: 1px solid rgba(10,10,10,0.12);
          background: #f7f6f3;
        }
        .site-footer-label {
          font-family: var(--font-condensed);
          font-size: 10px;
          letter-spacing: 0.22em;
          color: #0a0a0a;
        }
        .site-footer-links {
          display: flex;
          gap: 40px;
        }
        .site-footer-link {
          font-family: var(--font-condensed);
          font-size: 10px;
          letter-spacing: 0.22em;
          text-decoration: none;
          color: #0a0a0a;
        }
        .site-footer-link:hover {
          opacity: 0.55;
        }
        .site-footer-copy {
          font-family: var(--font-condensed);
          font-size: 10px;
          letter-spacing: 0.18em;
          color: rgba(10,10,10,0.4);
        }
        @media (max-width: 900px) {
          .site-footer { padding: 28px 24px; flex-wrap: wrap; gap: 20px; }
          .site-footer-links { gap: 24px; }
        }
        @media (max-width: 540px) {
          .site-footer { flex-direction: column; align-items: flex-start; padding: 24px 20px; gap: 16px; }
          .site-footer-links { flex-wrap: wrap; gap: 16px 24px; }
          .site-footer-label,
          .site-footer-link,
          .site-footer-copy { font-size: 12px; letter-spacing: 0.12em; }
        }
      `}</style>

      <footer className="site-footer">
        <span className="site-footer-label">( DEAL DOSSIER )</span>
        <div className="site-footer-links">
          {([['ARCHIVE', '/archive'], ['STORES', '/stores'], ['PRIVACY', '/privacy']] as const).map(([l, h]) => (
            <Link key={l} href={h} className="site-footer-link">{l}</Link>
          ))}
        </div>
        <span className="site-footer-copy">© 2026</span>
      </footer>
    </>
  )
}
