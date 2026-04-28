'use client'

import { useState } from 'react'

export function RunIngestButton() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const handleRun = async () => {
    setStatus('running')
    setResult(null)
    try {
      const res = await fetch('/api/admin/run-ingest', { method: 'POST' })
      const data = await res.json()
      setResult(data)
      setStatus(res.ok ? 'done' : 'error')
      if (res.ok) setTimeout(() => setStatus('idle'), 8000)
    } catch (err) {
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
          borderColor: status === 'done' ? 'rgba(10,10,10,0.2)' : status === 'error' ? '#c0392b' : '#0a0a0a',
          background: status === 'running' ? 'rgba(10,10,10,0.06)' : status === 'done' ? 'transparent' : '#0a0a0a',
          color: status === 'running' ? 'rgba(10,10,10,0.4)' : status === 'done' ? 'rgba(10,10,10,0.5)' : status === 'error' ? '#c0392b' : '#f7f6f3',
          cursor: status === 'running' ? 'default' : 'pointer',
        }}
      >
        {status === 'running' ? 'Running…' : status === 'done' ? '✓ Done' : status === 'error' ? 'Error — try again' : 'Run Ingest Now'}
      </button>
      {result && status === 'done' && (
        <span style={{
          fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: '0.15em',
          color: 'rgba(10,10,10,0.5)',
        }}>
          {(result.emails_processed as number) ?? 0} emails · {(result.new_deals as number) ?? 0} new deals
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
