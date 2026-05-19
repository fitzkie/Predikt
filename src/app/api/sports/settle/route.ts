import { NextResponse } from 'next/server'
import { db } from 'lib/db'

export const dynamic = 'force-dynamic'

const AZURO_SUBGRAPH = 'https://thegraph.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-api-polygon-v3'
const CORE_ADDRESS = '0xf9548be470a4e130c90cea8b179fcd66d2972ac7'
const AZURO_ORACLE_API = 'https://api.onchainfeed.org/api/v1/public'

async function fetchOracleOrderStatus(orderId: string): Promise<string | null> {
  try {
    const res = await fetch(`${AZURO_ORACLE_API}/bet/orders/${orderId}`, { next: { revalidate: 0 } })
    if (!res.ok) return null
    const data = await res.json()
    return data?.state ?? null
  }
  catch {
    return null
  }
}

type AzuroCondition = {
  conditionId: string
  status: 'Created' | 'Resolved' | 'Canceled' | 'Paused'
  wonOutcomeIds: string[]
}

async function fetchConditions(conditionIds: string[]): Promise<AzuroCondition[]> {
  // v3 subgraph uses composite id: {coreAddress}_{conditionId}
  const compositeIds = conditionIds.map((id) => `${CORE_ADDRESS}_${id}`)

  const query = `{
    v3Conditions(where: { id_in: [${compositeIds.map((id) => `"${id}"`).join(',')}] }) {
      conditionId
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

  return json?.data?.v3Conditions ?? []
}

// POST /api/sports/settle
// Queries the Azuro subgraph for all pending sports bets.
// Credits winnings to user balance for wins; marks losses and refunds for canceled conditions.
// Safe to run repeatedly — only touches bets with status 'pending'.
export async function POST() {
  try {
    const pendingBets = await db.sportsBet.findMany({
      where: { status: 'pending' },
      select: { id: true, userId: true, conditionId: true, outcomeId: true, amount: true, potentialPayout: true, azuroBetId: true },
    })

    if (pendingBets.length === 0) {
      return NextResponse.json({ message: 'No pending bets', settled: 0 })
    }

    const conditionIds = [...new Set(pendingBets.map((b) => b.conditionId))]
    const conditions = await fetchConditions(conditionIds)
    const conditionMap = new Map(conditions.map((c) => [c.conditionId, c]))

    let won = 0, lost = 0, canceled = 0, rejected = 0, skipped = 0

    for (const bet of pendingBets) {
      const condition = conditionMap.get(bet.conditionId)

      if (!condition || condition.status === 'Created' || condition.status === 'Paused') {
        // Check oracle API — if the bet was rejected, refund and mark failed
        if (bet.azuroBetId) {
          const oracleState = await fetchOracleOrderStatus(bet.azuroBetId)

          if (oracleState === 'Rejected') {
            await db.prediktsUser.update({
              where: { id: bet.userId },
              data: { usdBalance: { increment: Number(bet.amount) } },
            })
            await db.sportsBet.update({ where: { id: bet.id }, data: { status: 'failed' } })
            rejected++
            continue
          }
        }
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
      settled: won + lost + canceled + rejected,
      won,
      lost,
      canceled,
      rejected,
      skipped,
      totalChecked: pendingBets.length,
    })
  }
  catch (error) {
    console.error('[sports/settle] error:', error)

    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
