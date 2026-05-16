import { NextResponse } from 'next/server'
import { db } from 'lib/db'

export const dynamic = 'force-dynamic'


// GET /api/predikts/balance?address=0x...
// Returns the user's pUSD balance from our internal ledger.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')?.toLowerCase()

  if (!address) {
    return NextResponse.json({ balance: 0 })
  }

  try {
    const user = await db.prediktsUser.findUnique({
      where: { walletAddress: address },
      select: { pUsdBalance: true },
    })

    return NextResponse.json({ balance: user ? Number(user.pUsdBalance) : 0 })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
