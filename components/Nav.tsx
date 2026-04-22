'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DossierLogo } from './DossierLogo'
import { createClient } from '@/lib/supabase/client'

interface NavProps {
  showSubscribe?: boolean
  fixed?: boolean
}

const LINK: React.CSSProperties = {
  fontFamily: 'var(--font-condensed)',
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--ink-40)',
  textDecoration: 'none',
}

export function Nav({ showSubscribe = false, fixed = false }: NavProps) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user)
    })
  }, [])

  return (
    <nav style={{
      height: 56,
      display: 'flex',
      alignItems: 'center',
      padding: '0 60px',
      borderBottom: 'var(--rule)',
      background: 'var(--paper)',
      zIndex: fixed ? 100 : 10,
      ...(fixed
        ? { position: 'fixed', top: 0, left: 0, right: 0 } as React.CSSProperties
        : { position: 'sticky', top: 0 } as React.CSSProperties),
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <DossierLogo size={22} wordmarkSize={18} />
      </Link>

      <ul className="nav-links">
        {loggedIn && (
          <li><Link href="/stores" style={LINK}>Stores</Link></li>
        )}
        <li><Link href="/archive" style={LINK}>Archive</Link></li>
        {loggedIn && (
          <li><Link href="/preferences" style={LINK}>Settings</Link></li>
        )}
      </ul>

      {showSubscribe && loggedIn === false && (
        <Link href="/login" style={{
          marginLeft: 32,
          fontFamily: 'var(--font-condensed)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          background: 'var(--ink)',
          color: 'var(--paper)',
          padding: '10px 24px',
          textDecoration: 'none',
          display: 'inline-block',
          flexShrink: 0,
        }}>
          Subscribe Free
        </Link>
      )}
    </nav>
  )
}
