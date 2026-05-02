'use client'

import { useState } from 'react'

export function RunSendButton() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const handleRun = async () => {
    setStatus('running')
    setResult(null)
    try {
      const res = await fetch('/api/admin/run-send', { method: 'POST' })
      const data = await res.json()
      setResult(data)
      setStatus(res.ok ? 'done' : 'error')
      if (res.ok) setTimeout(() => setStatus('idle'), 10000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 5000)
    }
  }

  const summary =
    status === 'done' && result
      ? `${(result.sent as number) ?? 0} sent · ${(result.failed as number) ?? 0} failed`
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
        {status === 'idle' && 'Run Send'}
        {status === 'running' && 'Sending…'}
        {status === 'done' && (summary || '✓ Sent')}
        {status === 'error' &&
          ((result?.error as string | undefined) ?? 'Error — try again')}
      </span>
      {status === 'running' && <span className="admin-btn-spinner" aria-hidden="true" />}
    </button>
  )
}
