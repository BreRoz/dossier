import { NextResponse } from 'next/server'

// Cache the sheet for 1 hour — it doesn't change that often
export const revalidate = 3600

const SHEET_ID = process.env.STORES_SHEET_ID ||
  '1a_JG57qg8HLuAIqatEzKda47BPjnMGBzng0NijHF90I'

export interface StoreRow {
  name: string
  category: string          // raw sheet category
  appCategory: string       // mapped to app category slug
  subcategory: string
  website: string
  spendTier: string         // '$' | '$$' | '$$$' | '$$$$'
  shipsLower48: boolean
  hq: string
  city: string
  state: string
  dateAdded: string         // MM-DD-YYYY
  status: string
  notes: string
  isNew: boolean            // added in current or previous month
}

// ── CSV parser (handles quoted fields with commas) ────────────────────────────
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

// ── Category mapping: sheet value → app slug ─────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  'restaurants':   'restaurants',
  'tech':          'tech',
  'fashion':       'everyday-fashion',
  'accessories':   'everyday-fashion',
  'shoes':         'everyday-fashion',
  'beauty':        'beauty',
  'home':          'home',
  'tools':         'tools-yard',
  'kids':          'kids',
  'baby':          'baby',
  'athletic':      'athletic',
  'travel':        'travel',
  'grocery':       'grocery',
  'entertainment': 'tech',
  'premium fashion': 'premium-fashion',
  'everyday fashion': 'everyday-fashion',
}

function mapCategory(cat: string, subcat: string): string {
  const key = cat.toLowerCase().trim()
  const sub = subcat.toLowerCase().trim()

  // Fast Food subcategory → fast-food
  if (sub === 'fast food' || sub === 'fast casual') return 'fast-food'

  return CATEGORY_MAP[key] ?? 'everyday-fashion'
}

// ── "New" badge: added in current or previous month ───────────────────────────
function isNew(dateAdded: string): boolean {
  if (!dateAdded) return false

  // Format: MM-DD-YYYY
  const parts = dateAdded.split('-')
  if (parts.length !== 3) return false

  const month = parseInt(parts[0], 10) - 1  // 0-indexed
  const year  = parseInt(parts[2], 10)

  const now   = new Date()
  const curM  = now.getMonth()
  const curY  = now.getFullYear()

  // Current month
  if (year === curY && month === curM) return true

  // Previous month (handles Jan → Dec year wrap)
  const prevM = curM === 0 ? 11 : curM - 1
  const prevY = curM === 0 ? curY - 1 : curY
  if (year === prevY && month === prevM) return true

  return false
}

export async function GET() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
    const res = await fetch(url, { redirect: 'follow' })

    if (!res.ok) {
      return NextResponse.json({ stores: [], error: 'Failed to fetch sheet' }, { status: 200 })
    }

    const text = await res.text()
    const rows = parseCSV(text)

    if (rows.length < 2) {
      return NextResponse.json({ stores: [] })
    }

    // Map header names to indices
    const headers = rows[0].map((h) => h.toLowerCase().trim())
    const idx = (name: string) => headers.indexOf(name)

    const iName    = idx('company name')
    const iCat     = idx('category')
    const iWeb     = idx('website')
    const iTier    = idx('spend tier')
    const iShips   = idx('ships to lower 48?')
    const iSub     = idx('subcategory')
    const iHQ      = idx('hq')
    const iCity    = idx('city')
    const iState   = idx('state')
    const iDate    = idx('date added')
    const iStatus  = idx('status')
    const iNotes   = idx('notes')

    const stores: StoreRow[] = []

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      const name = r[iName] ?? ''
      if (!name) continue

      const cat    = r[iCat]    ?? ''
      const subcat = r[iSub]    ?? ''
      const date   = r[iDate]   ?? ''

      stores.push({
        name,
        category:     cat,
        appCategory:  mapCategory(cat, subcat),
        subcategory:  subcat,
        website:      r[iWeb]    ?? '',
        spendTier:    r[iTier]   ?? '$',
        shipsLower48: (r[iShips] ?? '').toLowerCase() === 'yes',
        hq:           r[iHQ]    ?? '',
        city:         r[iCity]  ?? '',
        state:        r[iState] ?? '',
        dateAdded:    date,
        status:       r[iStatus] ?? '',
        notes:        r[iNotes]  ?? '',
        isNew:        isNew(date),
      })
    }

    // Sort: new first, then alphabetical
    stores.sort((a, b) => {
      if (a.isNew && !b.isNew) return -1
      if (!a.isNew && b.isNew) return 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({ stores })
  } catch (err) {
    console.error('Stores sheet fetch error:', err)
    return NextResponse.json({ stores: [] })
  }
}
