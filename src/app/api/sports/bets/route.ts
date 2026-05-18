import { NextResponse } from 'next/server'
import { db } from 'lib/db'

export const dynamic = 'force-dynamic'

// GET /api/sports/bets?address=0x...
// Returns all sports bets placed by the given wallet address, newest first.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')?.toLowerCase()

  if (!address) {
    return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 })
  }

  try {
    const user = await db.prediktsUser.findUnique({
      where: { walletAddress: address },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ bets: [] })
    }

    // Run migration inline so the column always exists before querying
    await db.$executeRaw`ALTER TABLE sports_bets ADD COLUMN IF NOT EXISTS "selectionName" TEXT`

    const bets = await db.sportsBet.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        conditionId: true,
        outcomeId: true,
        marketName: true,
        selectionName: true,
        amount: true,
        potentialPayout: true,
        odds: true,
        status: true,
        txHash: true,
        azuroBetId: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      bets: bets.map((b) => ({
        ...b,
        amount: Number(b.amount),
        potentialPayout: Number(b.potentialPayout),
        createdAt: b.createdAt.toISOString(),
      })),
    })
  }
  catch (error) {
    console.error('[sports/bets] error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
