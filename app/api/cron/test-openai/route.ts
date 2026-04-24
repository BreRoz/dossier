import { NextRequest, NextResponse } from 'next/server'
import { extractDealsFromEmail } from '@/lib/openai'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const deals = await extractDealsFromEmail(
      'Gap <promo@gap.com>',
      '40% off everything this weekend only',
      'Shop now and save 40% off your entire purchase. Use code SAVE40 at checkout. Offer ends Sunday.'
    )
    return NextResponse.json({
      success: true,
      deals,
      openai_key_set: !!process.env.OPENAI_API_KEY,
      openai_key_prefix: process.env.OPENAI_API_KEY?.slice(0, 7) ?? 'not set',
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: String(err),
      openai_key_set: !!process.env.OPENAI_API_KEY,
      openai_key_prefix: process.env.OPENAI_API_KEY?.slice(0, 7) ?? 'not set',
    })
  }
}
