import { NextResponse } from 'next/server'
import { db } from 'lib/db'

export const dynamic = 'force-dynamic'

const GAMMA_API = 'https://gamma-api.polymarket.com'

type GammaMarket = {
  active?: boolean
  closed?: boolean
  clobTokenIds?: string   // JSON string: '["tokenId1","tokenId2"]'
  outcomePrices?: string  // JSON string: '["1","0"]' when resolved, '["0.6","0.4"]' when open
  question?: string
}

async function fetchMarketsByTokenIds(tokenIds: string[]): Promise<GammaMarket[]> {
  const url = `${GAMMA_API}/markets?clob_token_ids=${tokenIds.join(',')}`
  const res = await fetch(url, { next: { revalidate: 0 } })

  if (!res.ok) return []

  const json = await res.json()
  return Array.isArray(json) ? json : []
}

// POST /api/predikts/settle
// Checks Polymarket Gamma API for all markets with matched BUY positions.
// Credits usdBalance for winning positions (net of sold shares).
// Marks settled orders so they are not processed again.
// Share accounting:
//   BUY orders:  amount = USD spent → shares = amount / price
//   SELL orders: amount = shares sold directly
// Safe to run repeatedly — only touches orders with status 'matched'.
export async function POST() {
  try {
    const buyOrders = await db.prediktsOrder.findMany({
      where: { side: 'BUY', status: 'matched' },
      select: { id: true, userId: true, tokenId: true, amount: true, price: true },
    })

    if (buyOrders.length === 0) {
      return NextResponse.json({ message: 'No matched buy orders to settle', settled: 0 })
    }

    const tokenIds = [...new Set(buyOrders.map((o) => o.tokenId))]

    // Fetch corresponding SELL orders so we can subtract sold shares
    const sellOrders = await db.prediktsOrder.findMany({
      where: { side: 'SELL', status: 'matched', tokenId: { in: tokenIds } },
      select: { userId: true, tokenId: true, amount: true },
    })

    // Query Gamma API in batches of 50 (URL length limit)
    const BATCH = 50
    const allMarkets: GammaMarket[] = []

    for (let i = 0; i < tokenIds.length; i += BATCH) {
      const markets = await fetchMarketsByTokenIds(tokenIds.slice(i, i + BATCH))
      allMarkets.push(...markets)
    }

    // Build tokenId → { won } map from resolved markets only
    // A resolved winner has outcomePrices entry of "1", loser has "0"
    const tokenResults = new Map<string, { won: boolean }>()

    for (const market of allMarkets) {
      if (market.active !== false || !market.closed) continue

      let tokenIdsArr: string[] = []
      let pricesArr: string[] = []

      try {
        tokenIdsArr = JSON.parse(market.clobTokenIds ?? '[]')
        pricesArr = JSON.parse(market.outcomePrices ?? '[]')
      }
      catch { continue }

      for (let i = 0; i < tokenIdsArr.length; i++) {
        const price = parseFloat(pricesArr[i] ?? '0.5')
        tokenResults.set(tokenIdsArr[i], { won: price >= 0.99 })
      }
    }

    // Group BUY orders by (userId:tokenId)
    type BuyGroup = { buyShares: number; orderIds: string[] }
    const buyGroups = new Map<string, BuyGroup>()

    for (const order of buyOrders) {
      const key = `${order.userId}:${order.tokenId}`
      const shares = Number(order.amount) / order.price
      const existing = buyGroups.get(key) ?? { buyShares: 0, orderIds: [] }
      buyGroups.set(key, {
        buyShares: existing.buyShares + shares,
        orderIds: [...existing.orderIds, order.id],
      })
    }

    // Sold shares per (userId:tokenId) — SELL amount = shares directly
    const soldSharesByKey = new Map<string, number>()

    for (const sell of sellOrders) {
      const key = `${sell.userId}:${sell.tokenId}`
      soldSharesByKey.set(key, (soldSharesByKey.get(key) ?? 0) + Number(sell.amount))
    }

    let won = 0, lost = 0, skipped = 0, totalCredited = 0

    for (const [key, group] of buyGroups) {
      const colonIdx = key.indexOf(':')
      const userId = key.slice(0, colonIdx)
      const tokenId = key.slice(colonIdx + 1)
      const result = tokenResults.get(tokenId)

      if (!result) {
        skipped++
        continue
      }

      const netShares = group.buyShares - (soldSharesByKey.get(key) ?? 0)

      if (result.won && netShares > 0.001) {
        await db.prediktsUser.update({
          where: { id: userId },
          data: { usdBalance: { increment: netShares } },
        })
        totalCredited += netShares
        won++
      }
      else {
        lost++
      }

      await db.prediktsOrder.updateMany({
        where: { id: { in: group.orderIds } },
        data: { status: 'settled' },
      })
    }

    // Mark matched SELL orders on resolved markets settled too
    const resolvedTokenIds = [...tokenResults.keys()]

    if (resolvedTokenIds.length > 0) {
      await db.prediktsOrder.updateMany({
        where: { side: 'SELL', status: 'matched', tokenId: { in: resolvedTokenIds } },
        data: { status: 'settled' },
      })
    }

    return NextResponse.json({
      settled: won + lost,
      won,
      lost,
      skipped,
      totalCredited: Math.round(totalCredited * 100) / 100,
      totalChecked: buyOrders.length,
    })
  }
  catch (error) {
    console.error('[predikts/settle] error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
