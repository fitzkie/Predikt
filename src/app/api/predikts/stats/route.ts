import { NextResponse } from 'next/server'
import { db } from 'lib/db'
import { getPlatformOnChainBalances } from 'lib/platform-wallet'

export const dynamic = 'force-dynamic'


export async function GET() {
  try {
    const [
      totalBetters,
      totalOrders,
      amountAgg,
      payoutAgg,
      totalUserBalances,
      onChain,
      totalSportsBets,
      sportsBetAmountAgg,
      withdrawalAgg,
    ] = await Promise.all([
      db.prediktsUser.count(),
      db.prediktsOrder.count({ where: { status: { not: 'failed' } } }),
      db.prediktsOrder.aggregate({
        _sum: { amount: true },
        where: { status: { not: 'failed' } },
      }),
      db.prediktsOrder.aggregate({
        _sum: { amount: true },
        where: { side: 'SELL', status: { not: 'failed' } },
      }),
      // Sum of all user USD balances — what we owe users in total
      db.prediktsUser.aggregate({ _sum: { usdBalance: true } }),
      getPlatformOnChainBalances().catch(() => null),
      db.sportsBet.count({ where: { status: { not: 'failed' } } }),
      db.sportsBet.aggregate({
        _sum: { amount: true },
        where: { status: { not: 'failed' } },
      }),
      db.withdrawal.aggregate({
        _sum: { amountUsd: true },
        where: { status: 'completed' },
      }),
    ])

    return NextResponse.json({
      platformMaticBalance: onChain?.maticBalance ?? null,
      platformPUsdBalance: onChain?.pUsdBalance ?? null,
      platformUsdcBalance: onChain?.usdcBalance ?? null,
      platformUsdceBalance: onChain?.usdceBalance ?? null,
      depositWalletPusdBalance: onChain?.depositWalletPusdBalance ?? null,
      totalUserLiabilities: Number(totalUserBalances._sum.usdBalance ?? 0),
      totalBetters,
      totalOrders,
      totalBetAmount: Number(amountAgg._sum.amount ?? 0),
      totalSellVolume: Number(payoutAgg._sum.amount ?? 0),
      totalSportsBets,
      totalSportsBetAmount: Number(sportsBetAmountAgg._sum.amount ?? 0),
      totalWithdrawn: Number(withdrawalAgg._sum.amountUsd ?? 0),
    })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
