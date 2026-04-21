import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export interface RetailerSummary {
  name: string
  potential_savings: number | null   // max percent_off across all deals
  deal_count: number
  categories: string[]
}

export async function GET() {
  const supabase = createServiceClient()

  // Fetch all deals (we only need a few fields)
  const { data: deals, error } = await supabase
    .from('deals')
    .select('retailer, percent_off, categories')

  if (error || !deals) {
    return NextResponse.json({ retailers: [] })
  }

  // Aggregate per retailer
  const map = new Map<
    string,
    { max_pct: number | null; count: number; cats: Set<string> }
  >()

  for (const deal of deals) {
    const name = deal.retailer as string
    const pct = deal.percent_off as number | null
    const cats = (deal.categories as string[]) || []

    if (!map.has(name)) {
      map.set(name, { max_pct: pct, count: 1, cats: new Set(cats) })
    } else {
      const entry = map.get(name)!
      entry.count++
      if (pct !== null && (entry.max_pct === null || pct > entry.max_pct)) {
        entry.max_pct = pct
      }
      cats.forEach((c) => entry.cats.add(c))
    }
  }

  const retailers: RetailerSummary[] = Array.from(map.entries())
    .map(([name, { max_pct, count, cats }]) => ({
      name,
      potential_savings: max_pct,
      deal_count: count,
      categories: Array.from(cats),
    }))
    .sort((a, b) => {
      // Sort by potential savings desc, then name asc
      const aP = a.potential_savings ?? -1
      const bP = b.potential_savings ?? -1
      if (bP !== aP) return bP - aP
      return a.name.localeCompare(b.name)
    })

  return NextResponse.json({ retailers })
}
