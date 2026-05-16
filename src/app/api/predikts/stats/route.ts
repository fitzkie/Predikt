import { NextResponse } from 'next/server'
import { db } from 'lib/db'
import { getPlatformOnChainBalances } from 'lib/platform-wallet'


export async function GET() {
  try {
    const [
      totalBetters,
      totalOrders,
      amountAgg,
      payoutAgg,
      onChain,
    ] = await Promise.all([
      db.prediktsUser.count(),
      db.prediktsOrder.count({ where: { status: { not: 'failed' } } }),
      db.prediktsOrder.aggregate({
        _sum: { amount: true },
        where: { status: { not: 'failed' } },
      }),
      // Payouts = SELL orders that went through (user sold shares back)
      db.prediktsOrder.aggregate({
        _sum: { amount: true },
        where: { side: 'SELL', status: { not: 'failed' } },
      }),
      getPlatformOnChainBalances().catch(() => null),
    ])

    return NextResponse.json({
      platformPUsdBalance: onChain?.pUsdBalance ?? null,
      platformUsdcBalance: onChain?.usdcBalance ?? null,
      totalBetters,
      totalOrders,
      totalBetAmount: Number(amountAgg._sum.amount ?? 0),
      totalPayouts: Number(payoutAgg._sum.amount ?? 0),
    })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
