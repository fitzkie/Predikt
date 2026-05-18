import { NextResponse } from 'next/server'
import { db } from 'lib/db'

export const dynamic = 'force-dynamic'

// POST /api/cron/settle
// Runs both Polymarket and Azuro settlement in one call.
// Protect with CRON_SECRET so only Railway's cron service can trigger it.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL not set' }, { status: 500 })
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
  }

  const [predikts, sports] = await Promise.allSettled([
    fetch(`${baseUrl}/api/predikts/settle`, { method: 'POST', headers }).then((r) => r.json()),
    fetch(`${baseUrl}/api/sports/settle`, { method: 'POST', headers }).then((r) => r.json()),
  ])

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    predikts: predikts.status === 'fulfilled' ? predikts.value : { error: String((predikts as PromiseRejectedResult).reason) },
    sports: sports.status === 'fulfilled' ? sports.value : { error: String((sports as PromiseRejectedResult).reason) },
  })
}
