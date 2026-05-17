import { NextResponse } from 'next/server'
import { db } from 'lib/db'

export const dynamic = 'force-dynamic'


// GET /api/predikts/balance?address=0x...
// Returns the user's unified USD balance (usable for both Sports and Predikts).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')?.toLowerCase()

  if (!address) {
    return NextResponse.json({ balance: 0 })
  }

  try {
    const user = await db.prediktsUser.findUnique({
      where: { walletAddress: address },
      select: { usdBalance: true },
    })

    return NextResponse.json({ balance: user ? Number(user.usdBalance) : 0 })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
