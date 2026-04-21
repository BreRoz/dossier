import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()

  // Sum of all editions' emails_scanned = total retail emails we ingested
  const { data: editionStats } = await supabase
    .from('editions')
    .select('emails_scanned')

  const emailsCaught = (editionStats || []).reduce(
    (sum, row) => sum + (row.emails_scanned || 0),
    0
  )

  // Total dossier emails sent across all subscribers
  const { count: editionsSent } = await supabase
    .from('sent_emails')
    .select('*', { count: 'exact', head: true })

  const sent = editionsSent || 0
  const emailsSaved = Math.max(0, emailsCaught - sent)

  return NextResponse.json({
    emails_caught: emailsCaught,
    editions_sent: sent,
    emails_saved: emailsSaved,
  })
}
