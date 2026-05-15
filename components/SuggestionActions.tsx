'use client'

import { useEffect, useRef, useState } from 'react'

const PRESETS = [
  { value: 'added',           label: 'Added to watchlist',        glyph: '✓' },
  { value: 'not_us',          label: 'Not available in the US',   glyph: '✕' },
  { value: 'no_online_store', label: 'No online store',           glyph: '✕' },
  { value: 'no_deals',        label: "Doesn't provide deals/coupons", glyph: '✕' },
]

export function SuggestionActions({
  suggestionId,
  storeName,
  initialStatus,
}: {
  suggestionId: string
  storeName: string
  initialStatus: string
}) {
  const [status, setStatus]   = useState(initialStatus)
  const [open, setOpen]       = useState(false)
  const [note, setNote]       = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [selected, setSelected] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (status !== 'pending') {
    const isAdded = status === 'added'
    return (
      <span
        className="t-meta"
        style={{ color: isAdded ? 'var(--olive-deep)' : 'var(--ink-40)' }}
      >
        {isAdded ? '● Added' : `● ${status}`}
      </span>
    )
  }

  if (sent) {
    return (
      <span className="t-meta" style={{ color: 'var(--olive-deep)' }}>
        ✓ Response sent
      </span>
    )
  }

  const handleSend = async () => {
    if (!selected) return
    setSending(true)
    const res = await fetch('/api/admin/respond-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggestion_id: suggestionId,
        response_type: selected,
        note,
      }),
    })
    if (res.ok) {
      setStatus(selected === 'added' ? 'added' : 'declined')
      setSent(true)
      setOpen(false)
    }
    setSending(false)
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        display: 'inline-block',
        // Lift the whole control above sibling admin cards so the popover
        // doesn't slide behind "Recent Signups" (or anything else that
        // follows in the DOM). Only lifted while open.
        zIndex: open ? 50 : 'auto',
      }}
    >
      <button
        type="button"
        className="admin-link-btn"
        onClick={() => setOpen((o) => !o)}
      >
        Respond ↳
      </button>
      {open && (
        <div className="admin-popover" style={{ zIndex: 50 }}>
          <div className="t-meta" style={{ color: 'var(--ink-40)', marginBottom: 10 }}>
            Respond to: {storeName}
          </div>
          {PRESETS.map((r) => (
            <label
              key={r.value}
              className={`sug-row ${selected === r.value ? 'on' : ''}`}
            >
              <input
                type="radio"
                name={`s-${suggestionId}`}
                checked={selected === r.value}
                onChange={() => setSelected(r.value)}
              />
              <span
                style={{
                  marginRight: 8,
                  color: r.value === 'added' ? 'var(--olive-deep)' : 'var(--ink-40)',
                }}
              >
                {r.glyph}
              </span>
              <span>{r.label}</span>
            </label>
          ))}
          <textarea
            className="sug-note"
            placeholder="Optional note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
              marginTop: 10,
            }}
          >
            <button
              type="button"
              className="admin-link-btn"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              disabled={!selected || sending}
              onClick={handleSend}
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
