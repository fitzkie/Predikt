import { NextResponse } from 'next/server'
import { getPlatformAddress } from 'lib/platform-wallet'

export const dynamic = 'force-dynamic'


// GET — returns the platform deposit address (same wallet for Sports and Predikts)
export async function GET() {
  return NextResponse.json({ depositAddress: getPlatformAddress() })
}

// POST — proxies to unified /api/predikts/deposit
export async function POST(request: Request) {
  try {
    const body = await request.json()
    // Map legacy amountUsdt → amountUsd
    const normalized = {
      ...body,
      amountUsd: body.amountUsd ?? body.amountUsdt,
      token: body.token ?? 'USDT',
    }
    const base = new URL(request.url)
    const response = await fetch(`${base.origin}/api/predikts/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized),
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
