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

  const summary =
    status === 'done' && result
      ? `${(result.deals_shown as number) ?? 0} deals → ${(result.sent_to as string) ?? 'admin@'}`
      : null

  return (
    <button
      type="button"
      onClick={handleRun}
      disabled={status === 'running'}
      className={`admin-btn admin-btn-ghost ${status === 'running' ? 'is-running' : ''} ${
        status === 'done' ? 'is-done' : ''
      }`}
    >
      <span>
        {status === 'idle' && 'Send Preview'}
        {status === 'running' && 'Sending preview…'}
        {status === 'done' && (summary || '✓ Preview Sent')}
        {status === 'error' &&
          ((result?.error as string | undefined) ?? 'Error — try again')}
      </span>
      {status === 'running' && <span className="admin-btn-spinner" aria-hidden="true" />}
    </button>
  )
}
