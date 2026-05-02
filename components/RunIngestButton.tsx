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
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 5000)
    }
  }

  const summary =
    status === 'done' && result
      ? `${(result.emails_processed as number) ?? 0} emails · ${(result.new_deals as number) ?? 0} new deals`
      : null

  return (
    <button
      type="button"
      onClick={handleRun}
      disabled={status === 'running'}
      className={`admin-btn ${status === 'running' ? 'is-running' : ''} ${
        status === 'done' ? 'is-done' : ''
      }`}
    >
      <span>
        {status === 'idle' && 'Run Ingest'}
        {status === 'running' && 'Scanning…'}
        {status === 'done' && (summary || '✓ Done')}
        {status === 'error' &&
          ((result?.error as string | undefined) ?? 'Error — try again')}
      </span>
      {status === 'running' && <span className="admin-btn-spinner" aria-hidden="true" />}
    </button>
  )
}
