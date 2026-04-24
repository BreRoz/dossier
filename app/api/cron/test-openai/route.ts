import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Extract deals from promotional emails. Return JSON with a "deals" array.',
        },
        {
          role: 'user',
          content: 'FROM: Gap <promo@gap.com>\nSUBJECT: 40% off everything this weekend\nBODY: Shop now and save 40% off your entire purchase. Use code SAVE40 at checkout. Offer ends Sunday.',
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    })

    const raw = response.choices[0]?.message?.content
    return NextResponse.json({
      raw_response: raw,
      parsed: raw ? JSON.parse(raw) : null,
      model: response.model,
      usage: response.usage,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
