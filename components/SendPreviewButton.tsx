'use client'

import { useState } from 'react'

export function SendPreviewButton() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const handleRun = async () => {
    setStatus('running')
    setResult(null)
    try {
      const res = await fetch('/api/admin/send-preview', { method: 'POST' })
      const data = await res.json()
      setResult(data)
      setStatus(res.ok ? 'done' : 'error')
      if (res.ok) setTimeout(() => setStatus('idle'), 10000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 5000)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <button
        onClick={handleRun}
        disabled={status === 'running'}
        style={{
          fontFamily: 'var(--font-condensed)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          padding: '6px 18px', border: '1.5px solid',
          borderColor: status === 'done' ? 'rgba(10,10,10,0.2)' : status === 'error' ? '#c0392b' : 'rgba(10,10,10,0.4)',
          background: 'transparent',
          color: status === 'running' ? 'rgba(10,10,10,0.3)' : status === 'done' ? 'rgba(10,10,10,0.4)' : status === 'error' ? '#c0392b' : 'rgba(10,10,10,0.6)',
          cursor: status === 'running' ? 'default' : 'pointer',
        }}
      >
        {status === 'running' ? 'Sending…' : status === 'done' ? '✓ Preview Sent' : status === 'error' ? 'Error — try again' : 'Send Preview to Me'}
      </button>
      {result && status === 'done' && (
        <span style={{
          fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.15em',
          color: 'rgba(10,10,10,0.4)',
        }}>
          {(result.deals_shown as number) ?? 0} deals → {(result.sent_to as string) ?? ''}
        </span>
      )}
      {result && status === 'error' && (
        <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.15em', color: '#c0392b' }}>
          {(result.error as string) ?? 'Unknown error'}
        </span>
      )}
    </div>
  )
}
