'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function Nav() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user)
    })
  }, [])

  const links = [
    { label: 'HOME',     href: '/' },
    { label: 'ARCHIVE',  href: '/archive' },
    { label: 'STORES',   href: '/stores' },
    { label: 'SETTINGS', href: '/preferences' },
  ]

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 40px',
      borderBottom: '1px solid rgba(10,10,10,0.12)',
      background: '#f7f6f3',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {links.map(({ label, href }) => (
        <Link key={label} href={href} style={{
          fontFamily: 'var(--font-condensed)',
          fontSize: 10,
          letterSpacing: '0.22em',
          textDecoration: 'none',
          color: '#0a0a0a',
          borderBottom: pathname === href ? '1px solid #0a0a0a' : 'none',
          paddingBottom: pathname === href ? 2 : 0,
        }}>{label}</Link>
      ))}

      <div style={{ flex: 1 }} />

      <Link href="/login" style={{
        fontFamily: 'var(--font-condensed)',
        fontSize: 10,
        letterSpacing: '0.22em',
        textDecoration: 'none',
        color: '#0a0a0a',
      }}>
        {loggedIn ? 'ACCOUNT' : 'SIGN IN'}
      </Link>
    </nav>
  )
}
