import { NextResponse } from 'next/server'
import { db } from 'lib/db'
import { placePlatformOrder, getPlatformAddress } from 'lib/platform-wallet'


type TradeRequest = {
  userAddress: string
  tokenId: string
  side: 'BUY' | 'SELL'
  amount: number
  price: number
  orderType: 'MARKET' | 'LIMIT'
  size?: number
  marketQuestion?: string
}

export async function POST(request: Request) {
  try {
    const body: TradeRequest = await request.json()
    const { userAddress, tokenId, side, amount, price, orderType, size, marketQuestion } = body

    if (!userAddress || !tokenId || !side || !amount || !price) {
      return NextResponse.json({ error: 'Missing required fields: userAddress, tokenId, side, amount, price' }, { status: 400 })
    }

    const normalizedAddress = userAddress.toLowerCase()

    // Upsert the user record (creates on first trade)
    const user = await db.prediktsUser.upsert({
      where: { walletAddress: normalizedAddress },
      create: { walletAddress: normalizedAddress, pUsdBalance: 0 },
      update: {},
    })

    // BUY orders deduct from the user's pUSD balance.
    // SELL orders credit back (simplified: credit the full amount × price).
    if (side === 'BUY') {
      const cost = amount
      const currentBalance = Number(user.pUsdBalance)

      if (currentBalance < cost) {
        return NextResponse.json({
          error: `Insufficient balance. You have $${currentBalance.toFixed(2)} but need $${cost.toFixed(2)}.`,
          balance: currentBalance,
        }, { status: 400 })
      }
    }

    // Create a pending order record
    const order = await db.prediktsOrder.create({
      data: {
        userId: user.id,
        tokenId,
        marketQuestion,
        side,
        amount,
        price,
        orderType,
        status: 'pending',
      },
    })

    // Place the order via the platform wallet
    const result = await placePlatformOrder({ tokenId, side, amount, price, orderType, size })

    if (!result.success) {
      await db.prediktsOrder.update({
        where: { id: order.id },
        data: { status: 'failed', errorMessage: result.errorMsg, polyOrderId: result.orderId },
      })

      return NextResponse.json({ error: result.errorMsg || 'Order failed.' }, { status: 400 })
    }

    // Update the order status
    await db.prediktsOrder.update({
      where: { id: order.id },
      data: { status: result.status, polyOrderId: result.orderId },
    })

    // Deduct cost from user balance for BUY; add estimated proceeds for SELL
    if (side === 'BUY') {
      await db.prediktsUser.update({
        where: { id: user.id },
        data: { pUsdBalance: { decrement: amount } },
      })
    }
    else {
      const proceeds = amount * price
      await db.prediktsUser.update({
        where: { id: user.id },
        data: { pUsdBalance: { increment: proceeds } },
      })
    }

    const updatedUser = await db.prediktsUser.findUnique({ where: { id: user.id }, select: { pUsdBalance: true } })

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      status: result.status,
      newBalance: Number(updatedUser?.pUsdBalance ?? 0),
      platformAddress: getPlatformAddress(),
    })
  }
  catch (error) {
    console.error('[predikts/trade] error:', error)

    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
