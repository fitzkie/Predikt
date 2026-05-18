import { NextResponse } from 'next/server'
import { db } from 'lib/db'
import { placePlatformOrder, getPlatformAddress } from 'lib/platform-wallet'

export const dynamic = 'force-dynamic'


type TradeRequest = {
  userAddress: string
  tokenId: string
  side: 'BUY' | 'SELL'
  amount: number
  price: number
  orderType: 'MARKET' | 'LIMIT'
  size?: number
  marketQuestion?: string
  marketSlug?: string
}

export async function POST(request: Request) {
  try {
    const body: TradeRequest = await request.json()
    const { userAddress, tokenId, side, amount, price, orderType, size, marketQuestion, marketSlug } = body

    if (!userAddress || !tokenId || !side || !amount || !price) {
      return NextResponse.json({ error: 'Missing required fields: userAddress, tokenId, side, amount, price' }, { status: 400 })
    }

    const normalizedAddress = userAddress.toLowerCase()

    // Upsert the user record (creates on first trade)
    const user = await db.prediktsUser.upsert({
      where: { walletAddress: normalizedAddress },
      create: { walletAddress: normalizedAddress, usdBalance: 0 },
      update: {},
    })

    // BUY: deduct upfront to prevent double-spend. SELL: credit after order confirms.
    if (side === 'BUY') {
      const cost = amount
      const currentBalance = Number(user.usdBalance)

      if (currentBalance < cost) {
        return NextResponse.json({
          error: `Insufficient balance. You have $${currentBalance.toFixed(2)} but need $${cost.toFixed(2)}.`,
          balance: currentBalance,
        }, { status: 400 })
      }

      // Deduct before placing to close the race window
      await db.prediktsUser.update({
        where: { id: user.id },
        data: { usdBalance: { decrement: amount } },
      })
    }

    // Create a pending order record — round amount to 6dp to match Decimal(18,6)
    const order = await db.prediktsOrder.create({
      data: {
        userId: user.id,
        tokenId,
        marketQuestion,
        marketSlug,
        side,
        amount: parseFloat(amount.toFixed(6)),
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

      // Refund BUY balance if order was rejected
      if (side === 'BUY') {
        await db.prediktsUser.update({
          where: { id: user.id },
          data: { usdBalance: { increment: amount } },
        })
      }

      return NextResponse.json({ error: result.errorMsg || 'Order failed.' }, { status: 400 })
    }

    // Update the order status
    await db.prediktsOrder.update({
      where: { id: order.id },
      data: { status: result.status, polyOrderId: result.orderId },
    })

    // Credit SELL proceeds only after the order is confirmed on CLOB
    if (side === 'SELL') {
      const proceeds = parseFloat((amount * price).toFixed(6))
      await db.prediktsUser.update({
        where: { id: user.id },
        data: { usdBalance: { increment: proceeds } },
      })
    }

    const updatedUser = await db.prediktsUser.findUnique({ where: { id: user.id }, select: { usdBalance: true } })

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      status: result.status,
      newBalance: Number(updatedUser?.usdBalance ?? 0),
      platformAddress: getPlatformAddress(),
    })
  }
  catch (error) {
    console.error('[predikts/trade] error:', error)

    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
