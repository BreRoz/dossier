// POST /api/admin/stores/seed-from-sheet
//
// Imports the Google Sheet directory into Supabase. This iteration is
// status-aware:
//   - "active" / "approved" / "live" / "yes" → row is inserted with
//     is_active = true (we're already tracking them)
//   - "declined" / "rejected" / "blocked" / "blacklisted" → skipped
//     entirely
//   - Everything else (including blank, "pending") → inserted with
//     is_active = false. The ingest cron will flip these to active the
//     moment we receive a deal from that brand.
//
// Idempotent: rows whose website already exists in stores are skipped
// (LOWER(website) unique index), not overwritten. To re-tag categories
// or update stale rows, use the /admin/stores edit UI.

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SHEET_ID = process.env.STORES_SHEET_ID ||
  '1a_JG57qg8HLuAIqatEzKda47BPjnMGBzng0NijHF90I'

const ACTIVE_STATUS = new Set(['active', 'approved', 'live', 'yes', 'tracking'])
const NO_EMAIL_STATUS = new Set([
  'no email',
  'no_email',
  'email not available',
  'no promo email',
  'no newsletter',
  'no email list',
  'unavailable',
])
const REJECTED_STATUS = new Set(['declined', 'rejected', 'blocked', 'blacklisted', 'no'])

type ImportStatus = 'active' | 'pending' | 'no_email' | 'declined'

function classifyStatus(raw: string): ImportStatus {
  const s = raw.toLowerCase().trim()
  if (ACTIVE_STATUS.has(s)) return 'active'
  if (NO_EMAIL_STATUS.has(s)) return 'no_email'
  if (REJECTED_STATUS.has(s)) return 'declined'
  return 'pending'
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    if (!line.trim()) continue
    const cols: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        cols.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    cols.push(cur.trim())
    rows.push(cols)
  }
  return rows
}

// Normalize a sheet date string to YYYY-MM-DD for Postgres DATE.
// Tolerates several formats the sheet has accumulated over time:
//   - MM-DD-YYYY        (the original legacy format)
//   - MM/DD/YYYY        (Google Sheets default for US locale)
//   - YYYY-MM-DD        (ISO — what you get if Sheets recognized it as a date)
//   - 2-digit years     (interpret 00-49 as 20XX, 50-99 as 19XX)
// Returns null if the input can't be parsed into a real calendar date.
function reformatDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  // Split on '-' or '/' to handle both separators.
  const parts = s.split(/[-/]/).map((p) => p.trim()).filter(Boolean)
  if (parts.length !== 3) return null

  let y: number, m: number, d: number

  // Heuristic: if the first part is 4 digits, treat as YYYY-MM-DD.
  // Otherwise treat as MM/DD/YYYY (the US-locale default).
  if (parts[0].length === 4) {
    y = parseInt(parts[0], 10)
    m = parseInt(parts[1], 10)
    d = parseInt(parts[2], 10)
  } else {
    m = parseInt(parts[0], 10)
    d = parseInt(parts[1], 10)
    y = parseInt(parts[2], 10)
    // 2-digit year — assume 2000s for < 50, 1900s for >= 50
    if (y < 100) y = y < 50 ? 2000 + y : 1900 + y
  }

  // Sanity check the components — anything out of range means we
  // mis-parsed, return null and let the DB default kick in.
  if (
    !Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d) ||
    y < 1900 || y > 2100 ||
    m < 1 || m > 12 ||
    d < 1 || d > 31
  ) {
    return null
  }

  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export async function POST() {
  // Admin gate
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || !user || user.email !== adminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch sheet' }, { status: 502 })
  }
  const rows = parseCSV(await res.text())
  if (rows.length < 2) {
    return NextResponse.json({ imported: 0, skipped: 0, message: 'Sheet is empty' })
  }

  const headers = rows[0].map((h) => h.toLowerCase().trim())
  const findCol = (aliases: string[]): number => {
    for (const alias of aliases) {
      const i = headers.indexOf(alias)
      if (i >= 0) return i
    }
    return -1
  }

  const iName = findCol(['company name', 'brand', 'brand name', 'store', 'store name', 'name'])
  const iWeb = findCol(['website', 'url', 'site', 'domain', 'link'])
  const iTier = findCol(['spend tier', 'spend', 'price tier', 'price', 'tier'])
  const iSub = findCol(['subcategory', 'sub-category', 'sub category', 'sub type', 'sub-type'])
  const iDate = findCol(['date added', 'added', 'added on', 'date'])
  const iAge = findCol(['age group', 'age'])
  // Try standard status column names — also fall back to header[1] if
  // it's blank (older sheet layout had an unnamed status column there).
  const iStatus =
    findCol(['status', 'state', 'active', 'tracking']) >= 0
      ? findCol(['status', 'state', 'active', 'tracking'])
      : (headers[1] === '' ? 1 : -1)

  if (iName < 0 || iWeb < 0) {
    return NextResponse.json(
      {
        error: 'Sheet is missing required columns (name and website)',
        detected_headers: rows[0],
      },
      { status: 400 }
    )
  }

  const seenWebsites = new Set<string>()
  const records: Array<{
    name: string
    website: string
    sub_types: string[]
    price_tier: string | null
    age_group: string | null
    date_added: string | null
    status: ImportStatus
  }> = []

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const name = (r[iName] ?? '').trim()
    const website = (r[iWeb] ?? '').trim()
    if (!name || !website) continue

    const rawStatus = iStatus >= 0 ? (r[iStatus] ?? '') : ''
    const importStatus = classifyStatus(rawStatus)

    const websiteKey = website.toLowerCase()
    if (seenWebsites.has(websiteKey)) continue
    seenWebsites.add(websiteKey)

    const subRaw = iSub >= 0 ? (r[iSub] ?? '').trim() : ''
    const subTypes = subRaw
      ? subRaw.split(/[,;/]/).map((s) => s.trim()).filter(Boolean)
      : []

    records.push({
      name,
      website,
      sub_types: subTypes,
      price_tier: iTier >= 0 ? ((r[iTier] ?? '').trim() || null) : null,
      age_group: iAge >= 0 ? ((r[iAge] ?? '').trim() || null) : null,
      date_added: iDate >= 0 ? reformatDate(r[iDate] ?? '') : null,
      status: importStatus,
    })
  }

  if (records.length === 0) {
    return NextResponse.json({
      imported: 0,
      message: 'No valid importable rows',
    })
  }

  const service = createServiceClient()
  const counts = { active: 0, pending: 0, no_email: 0, declined: 0 }
  let skipped = 0
  // Once we discover the status column is missing on the first row, stop
  // sending it on subsequent inserts — avoids one failed insert per row.
  let statusColumnExists = true

  for (const rec of records) {
    const baseRow = {
      name: rec.name,
      website: rec.website,
      categories: [],
      sub_types: rec.sub_types,
      price_tier: rec.price_tier,
      age_group: rec.age_group,
      date_added: rec.date_added ?? undefined,
      // is_active is the quick visibility flag; status carries the
      // detailed reason. Keep them in sync.
      is_active: rec.status === 'active',
    }
    const row = statusColumnExists
      ? { ...baseRow, status: rec.status }
      : baseRow

    let { error } = await service.from('stores').insert(row)

    // 42703 = column does not exist → migration 019 not applied yet.
    // Retry without the status column and remember for the rest of the
    // loop so we don't bang on the same wall 1700 times.
    if (error && (error as { code?: string }).code === '42703' && statusColumnExists) {
      console.warn('[seed-from-sheet] status column missing — falling back. Run migration 019.')
      statusColumnExists = false
      const retry = await service.from('stores').insert(baseRow)
      error = retry.error
    }

    if (error) {
      const code = (error as { code?: string }).code
      if (code === '23505') {
        skipped++
      } else {
        // Log the exact row that broke so we can diagnose without
        // re-running the import. The first failure tells us everything.
        console.error('[seed-from-sheet] insert error on row:', JSON.stringify(row))
        console.error('[seed-from-sheet] error detail:', JSON.stringify(error))
        return NextResponse.json(
          {
            error: 'Insert failed',
            imported_so_far: counts,
            skipped,
            detail: error.message,
            postgres_code: code,
            failed_row: { name: rec.name, website: rec.website, status: rec.status },
            migration_needed: !statusColumnExists,
          },
          { status: 500 }
        )
      }
    } else {
      counts[rec.status]++
    }
  }

  const totalImported = counts.active + counts.pending + counts.no_email + counts.declined
  return NextResponse.json({
    imported: totalImported,
    by_status: counts,
    skipped_duplicate: skipped,
    total_in_sheet: records.length,
  })
}
