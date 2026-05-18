import { NextResponse } from 'next/server'
import { db } from 'lib/db'

export const dynamic = 'force-dynamic'

const AZURO_SUBGRAPH = 'https://thegraph.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-api-polygon-v3'

type AzuroCondition = {
  id: string
  status: 'Created' | 'Resolved' | 'Canceled' | 'Paused'
  wonOutcomeIds: string[]
}

async function fetchConditions(conditionIds: string[]): Promise<AzuroCondition[]> {
  const query = `{
    conditions(where: { id_in: [${conditionIds.map((id) => `"${id}"`).join(',')}] }) {
      id
      status
      wonOutcomeIds
    }
  }`

  const res = await fetch(AZURO_SUBGRAPH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    next: { revalidate: 0 },
  })

  const json = await res.json()

  return json?.data?.conditions ?? []
}

// POST /api/sports/settle
// Queries the Azuro subgraph for all pending sports bets.
// Credits winnings to user balance for wins; marks losses and refunds for canceled conditions.
// Safe to run repeatedly — only touches bets with status 'pending'.
export async function POST() {
  try {
    const pendingBets = await db.sportsBet.findMany({
      where: { status: 'pending' },
      select: { id: true, userId: true, conditionId: true, outcomeId: true, amount: true, potentialPayout: true },
    })

    if (pendingBets.length === 0) {
      return NextResponse.json({ message: 'No pending bets', settled: 0 })
    }

    const conditionIds = [...new Set(pendingBets.map((b) => b.conditionId))]
    const conditions = await fetchConditions(conditionIds)
    const conditionMap = new Map(conditions.map((c) => [c.id, c]))

    let won = 0, lost = 0, canceled = 0, skipped = 0

    for (const bet of pendingBets) {
      const condition = conditionMap.get(bet.conditionId)

      if (!condition || condition.status === 'Created' || condition.status === 'Paused') {
        skipped++
        continue
      }

      if (condition.status === 'Canceled') {
        // Refund the bet amount
        await db.prediktsUser.update({
          where: { id: bet.userId },
          data: { usdBalance: { increment: Number(bet.amount) } },
        })
        await db.sportsBet.update({ where: { id: bet.id }, data: { status: 'refunded' } })
        canceled++
        continue
      }

      if (condition.status === 'Resolved') {
        const didWin = condition.wonOutcomeIds.includes(bet.outcomeId)

        if (didWin) {
          await db.prediktsUser.update({
            where: { id: bet.userId },
            data: { usdBalance: { increment: Number(bet.potentialPayout) } },
          })
          await db.sportsBet.update({ where: { id: bet.id }, data: { status: 'won' } })
          won++
        }
        else {
          await db.sportsBet.update({ where: { id: bet.id }, data: { status: 'lost' } })
          lost++
        }
      }
    }

    return NextResponse.json({
      settled: won + lost + canceled,
      won,
      lost,
      canceled,
      skipped,
      totalChecked: pendingBets.length,
    })
  }
  catch (error) {
    console.error('[sports/settle] error:', error)

    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
