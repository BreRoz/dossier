'use client'

import { useState } from 'react'

const PRESETS = [
  { value: 'added',           label: '✅ Added to watchlist' },
  { value: 'not_us',          label: '❌ Not available in the US' },
  { value: 'no_online_store', label: '❌ No online store' },
  { value: 'no_deals',        label: '❌ Doesn\'t provide deals/coupons' },
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
  const [status, setStatus]       = useState(initialStatus)
  const [open, setOpen]           = useState(false)
  const [note, setNote]           = useState('')
  const [sending, setSending]     = useState(false)
  const [sent, setSent]           = useState(false)
  const [selected, setSelected]   = useState('')

  if (status !== 'pending') {
    return (
      <span style={{
        fontFamily: 'var(--font-condensed)', fontSize: 9, letterSpacing: '0.15em',
        textTransform: 'uppercase', padding: '2px 8px', border: '1px solid',
        borderColor: status === 'added' ? 'var(--accent)' : 'var(--ink-15)',
        color: status === 'added' ? 'var(--accent)' : 'var(--ink-40)',
      }}>
        {status}
      </span>
    )
  }

  if (sent) {
    return (
      <span style={{
        fontFamily: 'var(--font-condensed)', fontSize: 9, letterSpacing: '0.15em',
        textTransform: 'uppercase', color: 'var(--accent)',
      }}>
        Response sent ✓
      </span>
    )
  }

  const handleSend = async () => {
    if (!selected) return
    setSending(true)
    const res = await fetch('/api/admin/respond-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestion_id: suggestionId, response_type: selected, note }),
    })
    if (res.ok) {
      const d = await res.json()
      setStatus(selected === 'added' ? 'added' : 'declined')
      setSent(true)
      setOpen(false)
    }
    setSending(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            fontFamily: 'var(--font-condensed)', fontSize: 9, fontWeight: 600,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            background: 'var(--ink)', color: 'var(--paper)',
            border: 'none', padding: '4px 10px', cursor: 'pointer',
          }}
        >
          Respond
        </button>
      ) : (
        <div style={{
          position: 'absolute', right: 0, top: 0, zIndex: 50,
          background: 'var(--paper)', border: '1.5px solid var(--ink-15)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          width: 300, padding: 20,
        }}>
          <p style={{
            fontFamily: 'var(--font-condensed)', fontSize: 9, fontWeight: 600,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--ink-40)', marginBottom: 12,
          }}>
            Respond to: {storeName}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {PRESETS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSelected(value)}
                style={{
                  textAlign: 'left', padding: '9px 12px',
                  border: '1.5px solid',
                  borderColor: selected === value ? 'var(--ink)' : 'var(--ink-15)',
                  background: selected === value ? 'var(--ink)' : 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontSize: 12,
                  color: selected === value ? 'var(--paper)' : 'var(--ink)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a personal note (optional)..."
            rows={2}
            className="field-input"
            style={{ fontSize: 12, resize: 'none', marginBottom: 12 }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSend}
              disabled={!selected || sending}
              style={{
                flex: 1, fontFamily: 'var(--font-condensed)', fontSize: 10,
                fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase',
                background: selected ? 'var(--ink)' : 'var(--ink-15)',
                color: 'var(--paper)', border: 'none',
                padding: '10px 0', cursor: selected ? 'pointer' : 'not-allowed',
              }}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{
                fontFamily: 'var(--font-condensed)', fontSize: 10,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                background: 'transparent', color: 'var(--ink-40)',
                border: '1.5px solid var(--ink-15)', padding: '10px 16px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
