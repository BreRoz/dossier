'use client'

import { useState } from 'react'

export function ResetWeekButton({ weekOf }: { weekOf: string }) {
  const [status, setStatus] = useState<'idle' | 'confirm' | 'resetting' | 'done' | 'error'>('idle')

  const handleReset = async () => {
    setStatus('resetting')
    try {
      const res = await fetch('/api/admin/reset-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_of: weekOf }),
      })
      if (res.ok) {
        setStatus('done')
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setStatus('error')
        setTimeout(() => setStatus('idle'), 4000)
      }
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  if (status === 'confirm') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'rgba(10,10,10,0.5)',
        }}>
          Clear all deals, scan log + processed emails for this week?
        </span>
        <button
          onClick={handleReset}
          style={{
            fontFamily: 'var(--font-condensed)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            padding: '5px 14px', border: '1.5px solid #c0392b',
            background: '#c0392b', color: '#fff', cursor: 'pointer',
          }}
        >
          Yes, Reset
        </button>
        <button
          onClick={() => setStatus('idle')}
          style={{
            fontFamily: 'var(--font-condensed)', fontSize: 10,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            padding: '5px 12px', border: '1.5px solid rgba(10,10,10,0.12)',
            background: 'transparent', color: 'rgba(10,10,10,0.4)', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setStatus('confirm')}
      disabled={status === 'resetting'}
      style={{
        fontFamily: 'var(--font-condensed)', fontSize: 10, fontWeight: 600,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        padding: '6px 16px', border: '1.5px solid',
        borderColor: status === 'done' ? 'rgba(10,10,10,0.12)' : status === 'error' ? '#c0392b' : 'rgba(10,10,10,0.2)',
        background: 'transparent',
        color: status === 'done' ? 'rgba(10,10,10,0.4)' : status === 'error' ? '#c0392b' : 'rgba(10,10,10,0.5)',
        cursor: status === 'resetting' ? 'default' : 'pointer',
      }}
    >
      {status === 'resetting' ? 'Resetting...' : status === 'done' ? '✓ Reset' : status === 'error' ? 'Error — try again' : 'Reset This Week'}
    </button>
  )
}
