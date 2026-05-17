import { NextResponse } from 'next/server'
import { db } from 'lib/db'

export const dynamic = 'force-dynamic'

// Unified balance endpoint — both Sports and Predikts share one USD balance.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')?.toLowerCase()

    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 })
    }

    const user = await db.prediktsUser.findUnique({
      where: { walletAddress: address },
      select: { usdBalance: true },
    })

    return NextResponse.json({ balance: Number(user?.usdBalance ?? 0) })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
