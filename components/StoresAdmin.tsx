'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { groupCategories } from '@/lib/categoryGroups'

interface Store {
  id: string
  name: string
  website: string
  categories: string[]
  sub_types: string[]
  price_tier: string | null
  is_active: boolean
  status: string
  age_group: string | null
  affiliate_id: string | null
  date_added: string
  updated_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:   { label: 'Active',   color: 'var(--olive-deep)' },
  pending:  { label: 'Pending',  color: 'var(--ink-55)' },
  no_email: { label: 'No email', color: 'var(--ink-40)' },
  declined: { label: 'Declined', color: 'var(--ink-40)' },
}

interface Category {
  slug: string
  label: string
  group_name?: string | null
}

const PRICE_TIERS = ['$', '$$', '$$$', '$$$$'] as const

const emptyDraft = (): Partial<Store> => ({
  name: '',
  website: '',
  categories: [],
  sub_types: [],
  price_tier: null,
  is_active: true,
  status: 'active',
  age_group: null,
  affiliate_id: null,
})

export function StoresAdmin() {
  const [stores, setStores] = useState<Store[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null) // null = none, 'new' = new row
  const [draft, setDraft] = useState<Partial<Store>>(emptyDraft())
  const [saving, setSaving] = useState(false)
  const [autoTagging, setAutoTagging] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const loadStores = useCallback(async (q?: string) => {
    setLoading(true)
    setError(null)
    try {
      const url = q ? `/api/admin/stores?q=${encodeURIComponent(q)}` : '/api/admin/stores'
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load stores')
      const data = await res.json()
      setStores(data.stores ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stores')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStores()
    fetch('/api/categories')
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => {})
  }, [loadStores])

  // Debounce the search input so we don't fire a query on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      loadStores(search.trim() || undefined)
    }, 300)
    return () => clearTimeout(handle)
  }, [search, loadStores])

  const groupedCategories = useMemo(
    () => groupCategories(categories),
    [categories]
  )

  const startEdit = (store: Store) => {
    setError(null)
    setInfo(null)
    setEditingId(store.id)
    setDraft({ ...store })
  }

  const startNew = () => {
    setError(null)
    setInfo(null)
    setEditingId('new')
    setDraft(emptyDraft())
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(emptyDraft())
  }

  const save = async () => {
    if (!draft.name?.trim() || !draft.website?.trim()) {
      setError('Name and website are required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const isNew = editingId === 'new'
      const url = isNew ? '/api/admin/stores' : `/api/admin/stores/${editingId}`
      const method = isNew ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Save failed')
      }
      setEditingId(null)
      setDraft(emptyDraft())
      setInfo(isNew ? 'Store added' : 'Store updated')
      await loadStores(search.trim() || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const setStatus = async (id: string, status: string, name: string) => {
    try {
      const res = await fetch(`/api/admin/stores/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Update failed')
      setInfo(`${name} → ${STATUS_LABELS[status]?.label ?? status}`)
      await loadStores(search.trim() || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  const seedFromSheet = async () => {
    if (!confirm('Import stores from the Google Sheet?\n\nActive/approved rows come in as visible.\nPending (or anything else) rows come in as hidden — they auto-activate the first time the ingest cron sees a deal from them.\n\nExisting websites are skipped (no overwrite).')) return
    setSeeding(true)
    setError(null)
    setInfo(null)
    try {
      const res = await fetch('/api/admin/stores/seed-from-sheet', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        let msg = data.error || 'Import failed'
        if (data.postgres_code) msg += ` (code ${data.postgres_code})`
        if (data.detail) msg += ` — ${data.detail}`
        if (data.failed_row) {
          msg += ` · failed row: ${data.failed_row.name} (${data.failed_row.website}, status=${data.failed_row.status})`
        }
        if (data.imported_so_far) {
          const c = data.imported_so_far
          msg += ` · imported before fail: ${c.active}a/${c.pending}p/${c.no_email}n/${c.declined}d`
        }
        if (data.detected_headers) msg += ` — headers: ${JSON.stringify(data.detected_headers)}`
        throw new Error(msg)
      }
      setInfo(
        `Imported ${data.imported} (${data.imported_pending} pending). ` +
        `Skipped ${data.skipped_duplicate} existing, ${data.rejected_status} marked declined. ` +
        `Total processed: ${data.total_in_sheet}.`
      )
      await loadStores(search.trim() || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setSeeding(false)
    }
  }

  const autoTagCategories = async (force: boolean) => {
    const message = force
      ? 'Re-tag categories for EVERY store using AI? This will overwrite existing category assignments.'
      : 'Run AI category tagging for stores with empty categories?'
    if (!confirm(message)) return
    setAutoTagging(true)
    setError(null)
    setInfo(null)
    try {
      const url = force
        ? '/api/admin/stores/auto-tag-categories?force=1'
        : '/api/admin/stores/auto-tag-categories'
      const res = await fetch(url, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Auto-tag failed')
      setInfo(
        `Tagged ${data.tagged} stores. ${data.skipped_unknown} were unknown to the LLM and need manual tagging.`
      )
      await loadStores(search.trim() || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-tag failed')
    } finally {
      setAutoTagging(false)
    }
  }

  const toggleCategory = (slug: string) => {
    setDraft((prev) => {
      const set = new Set(prev.categories ?? [])
      if (set.has(slug)) set.delete(slug)
      else set.add(slug)
      return { ...prev, categories: Array.from(set) }
    })
  }

  return (
    <div style={{ marginTop: 48 }}>
      {/* Controls */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 24,
        }}
      >
        <div className="field" style={{ flex: 1, minWidth: 260 }}>
          <input
            type="search"
            placeholder="Search stores by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={startNew}
          disabled={editingId !== null}
          className="btn-primary"
        >
          + Add store
        </button>
        <button
          type="button"
          onClick={() => autoTagCategories(false)}
          disabled={autoTagging || editingId !== null}
          className="btn-ghost"
          style={{ fontSize: 12 }}
          title="Fills empty Categories columns by asking the LLM what each brand sells"
        >
          {autoTagging ? 'Tagging…' : 'AI tag categories'}
        </button>
        <button
          type="button"
          onClick={seedFromSheet}
          disabled={seeding || editingId !== null}
          className="btn-ghost"
          style={{ fontSize: 12 }}
          title="Re-import from Google Sheet. Pending rows come in hidden + auto-activate on first deal."
        >
          {seeding ? 'Importing…' : 'Import from sheet'}
        </button>
      </div>

      {/* Banners */}
      {error && (
        <div
          style={{
            padding: '10px 14px',
            border: '1px solid var(--ink-15)',
            background: '#fff7f5',
            color: 'var(--ink)',
            fontSize: 13.5,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}
      {info && (
        <div
          style={{
            padding: '10px 14px',
            border: '1px solid var(--ink-15)',
            background: 'var(--olive-soft, #f4f5ef)',
            color: 'var(--ink)',
            fontSize: 13.5,
            marginBottom: 16,
          }}
        >
          {info}
        </div>
      )}

      {/* Edit / new form (renders above the table when active) */}
      {editingId !== null && (
        <StoreForm
          draft={draft}
          setDraft={setDraft}
          groupedCategories={groupedCategories}
          toggleCategory={toggleCategory}
          onSave={save}
          onCancel={cancelEdit}
          saving={saving}
          isNew={editingId === 'new'}
        />
      )}

      {/* Table */}
      <div
        style={{
          marginTop: 24,
          border: '1px solid var(--ink-15)',
          background: 'var(--paper)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1.8fr 50px 70px 130px',
            gap: 12,
            padding: '12px 16px',
            borderBottom: '1px solid var(--ink-15)',
            background: 'var(--paper)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--ink-55)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div>Name</div>
          <div>Categories</div>
          <div>$</div>
          <div>Status</div>
          <div></div>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-55)' }}>Loading…</div>
        ) : stores.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-55)' }}>
            {search ? 'No stores match that search.' : 'No stores yet. Add one or import from the sheet.'}
          </div>
        ) : (
          stores.map((s) => {
            const catLabels = s.categories
              .map((slug) => categories.find((c) => c.slug === slug)?.label ?? slug)
              .slice(0, 3)
              .join(', ')
            const more = s.categories.length > 3 ? ` +${s.categories.length - 3}` : ''
            return (
              <div
                key={s.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1.8fr 50px 70px 130px',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--ink-08, var(--ink-15))',
                  alignItems: 'center',
                  fontSize: 13.5,
                  opacity: s.is_active ? 1 : 0.55,
                }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 500 }}>{s.name}</div>
                  <a
                    href={s.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{
                      fontSize: 11.5,
                      color: 'var(--ink-55)',
                      textDecoration: 'underline',
                      textUnderlineOffset: 2,
                    }}
                  >
                    {s.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-70)' }}>
                  {catLabels || <span style={{ color: 'var(--ink-40)' }}>—</span>}
                  {more}
                </div>
                <div className="t-mono" style={{ color: 'var(--ink-70)' }}>
                  {s.price_tier ?? '—'}
                </div>
                <div style={{ fontSize: 11, color: STATUS_LABELS[s.status]?.color ?? 'var(--ink-55)' }}>
                  {STATUS_LABELS[s.status]?.label ?? s.status}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => startEdit(s)}
                    disabled={editingId !== null}
                    className="btn-ghost"
                    style={{ fontSize: 10.5, padding: '5px 10px', letterSpacing: '0.06em' }}
                  >
                    Edit
                  </button>
                  {s.status !== 'declined' && (
                    <button
                      type="button"
                      onClick={() => setStatus(s.id, 'declined', s.name)}
                      className="btn-ghost"
                      style={{ fontSize: 10.5, padding: '5px 10px', letterSpacing: '0.06em', color: 'var(--ink-55)' }}
                      title="Mark as declined — hidden from /suggest autofill"
                    >
                      Decline
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--ink-55)' }}>
        {stores.length} store{stores.length === 1 ? '' : 's'}
        {search ? ` matching "${search}"` : ''}
      </div>
    </div>
  )
}

function StoreForm({
  draft,
  setDraft,
  groupedCategories,
  toggleCategory,
  onSave,
  onCancel,
  saving,
  isNew,
}: {
  draft: Partial<Store>
  setDraft: (updater: (prev: Partial<Store>) => Partial<Store>) => void
  groupedCategories: ReturnType<typeof groupCategories>
  toggleCategory: (slug: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isNew: boolean
}) {
  const [subTypeInput, setSubTypeInput] = useState('')
  const addSubType = () => {
    const v = subTypeInput.trim()
    if (!v) return
    setDraft((prev) => ({
      ...prev,
      sub_types: Array.from(new Set([...(prev.sub_types ?? []), v])),
    }))
    setSubTypeInput('')
  }
  const removeSubType = (s: string) => {
    setDraft((prev) => ({
      ...prev,
      sub_types: (prev.sub_types ?? []).filter((x) => x !== s),
    }))
  }

  return (
    <div
      style={{
        marginBottom: 24,
        padding: 24,
        border: '1.5px solid var(--ink)',
        background: 'var(--paper)',
      }}
    >
      <div className="t-eyebrow" style={{ marginBottom: 16 }}>
        {isNew ? 'New Store' : 'Edit Store'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <div className="t-meta" style={{ marginBottom: 6 }}>Name *</div>
          <div className="field">
            <input
              type="text"
              value={draft.name ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              placeholder="J.Crew"
            />
          </div>
        </div>
        <div>
          <div className="t-meta" style={{ marginBottom: 6 }}>Website *</div>
          <div className="field">
            <input
              type="url"
              value={draft.website ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, website: e.target.value }))}
              placeholder="https://jcrew.com"
            />
          </div>
        </div>
      </div>

      {/* Categories — grouped */}
      <div style={{ marginBottom: 16 }}>
        <div className="t-meta" style={{ marginBottom: 6 }}>
          Categories — pick everything this brand sells
        </div>
        <div
          style={{
            maxHeight: 280,
            overflowY: 'auto',
            padding: 8,
            border: '1px solid var(--ink-15)',
            background: 'var(--bone, var(--paper))',
          }}
        >
          {groupedCategories.map((group) => (
            <div key={group.name} style={{ marginBottom: 12 }}>
              <div
                className="t-meta"
                style={{
                  padding: '4px 4px 6px',
                  color: 'var(--olive-deep)',
                  letterSpacing: '0.08em',
                  fontSize: 10.5,
                  textTransform: 'uppercase',
                  position: 'sticky',
                  top: 0,
                  background: 'var(--bone, var(--paper))',
                  zIndex: 1,
                }}
              >
                {group.name}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: 4,
                }}
              >
                {group.items.map((c) => {
                  const on = (draft.categories ?? []).includes(c.slug)
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => toggleCategory(c.slug)}
                      style={{
                        textAlign: 'left',
                        padding: '6px 10px',
                        border: `1.5px solid ${on ? 'var(--ink)' : 'var(--ink-15)'}`,
                        background: on ? 'var(--ink)' : 'transparent',
                        color: on ? 'var(--paper)' : 'var(--ink)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: 12,
                        transition: 'all .12s',
                      }}
                    >
                      {on ? '✓ ' : '+ '}{c.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-types — chip-based input */}
      <div style={{ marginBottom: 16 }}>
        <div className="t-meta" style={{ marginBottom: 6 }}>
          Sub-types — sub-classifications (denim, cashmere, fast food)
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            <input
              type="text"
              value={subTypeInput}
              onChange={(e) => setSubTypeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addSubType()
                }
              }}
              placeholder="Type a sub-type and press Enter"
            />
          </div>
          <button type="button" onClick={addSubType} className="btn-ghost" style={{ fontSize: 12 }}>
            Add
          </button>
        </div>
        {(draft.sub_types ?? []).length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(draft.sub_types ?? []).map((s) => (
              <span
                key={s}
                style={{
                  padding: '4px 10px',
                  background: 'var(--ink-08, #f0eee9)',
                  fontSize: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSubType(s)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--ink-55)',
                    padding: 0,
                    fontSize: 14,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Price tier, active, age */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <div className="t-meta" style={{ marginBottom: 6 }}>Price tier</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {PRICE_TIERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() =>
                  setDraft((p) => ({ ...p, price_tier: p.price_tier === t ? null : t }))
                }
                style={{
                  flex: 1,
                  padding: '8px',
                  border: `1.5px solid ${draft.price_tier === t ? 'var(--ink)' : 'var(--ink-15)'}`,
                  background: draft.price_tier === t ? 'var(--ink)' : 'transparent',
                  color: draft.price_tier === t ? 'var(--paper)' : 'var(--ink)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="t-meta" style={{ marginBottom: 6 }}>Status</div>
          <select
            value={draft.status ?? 'pending'}
            onChange={(e) => {
              const status = e.target.value
              setDraft((p) => ({
                ...p,
                status,
                // Keep is_active in sync — only the active status implies
                // public visibility.
                is_active: status === 'active',
              }))
            }}
            style={{
              width: '100%',
              padding: '8px 10px',
              fontFamily: 'inherit',
              fontSize: 13.5,
              border: '1.5px solid var(--ink-15)',
              background: 'var(--paper)',
              color: 'var(--ink)',
            }}
          >
            <option value="active">Active — tracked</option>
            <option value="pending">Pending — awaiting first email</option>
            <option value="no_email">No email — no promo list</option>
            <option value="declined">Declined — don&rsquo;t track</option>
          </select>
        </div>
        <div>
          <div className="t-meta" style={{ marginBottom: 6 }}>Age group</div>
          <div className="field">
            <input
              type="text"
              value={draft.age_group ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, age_group: e.target.value || null }))}
              placeholder="All Ages"
            />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div className="t-meta" style={{ marginBottom: 6 }}>Affiliate ID</div>
        <div className="field">
          <input
            type="text"
            value={draft.affiliate_id ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, affiliate_id: e.target.value || null }))}
            placeholder="(leave blank for now)"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button type="button" onClick={onSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : isNew ? 'Add store' : 'Save changes'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn-ghost">
          Cancel
        </button>
      </div>
    </div>
  )
}
