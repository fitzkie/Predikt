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
    // Round to 6dp immediately — JS floating-point (e.g. price * size = 4.999999999999999)
    // exceeds Decimal(18,6) scale and causes Prisma P2000 on any write.
    const roundedAmount = parseFloat(amount.toFixed(6))

    // Upsert the user record (creates on first trade)
    const user = await db.prediktsUser.upsert({
      where: { walletAddress: normalizedAddress },
      create: { walletAddress: normalizedAddress, usdBalance: 0 },
      update: {},
    })

    // BUY: deduct upfront to prevent double-spend. SELL: credit after order confirms.
    if (side === 'BUY') {
      const currentBalance = Number(user.usdBalance)

      if (currentBalance < roundedAmount) {
        return NextResponse.json({
          error: `Insufficient balance. You have $${currentBalance.toFixed(2)} but need $${roundedAmount.toFixed(2)}.`,
          balance: currentBalance,
        }, { status: 400 })
      }

      // Deduct before placing to close the race window
      await db.prediktsUser.update({
        where: { id: user.id },
        data: { usdBalance: { decrement: roundedAmount } },
      })
    }

    // Create a pending order record
    const order = await db.prediktsOrder.create({
      data: {
        userId: user.id,
        tokenId,
        marketQuestion,
        marketSlug,
        side,
        amount: roundedAmount,
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
          data: { usdBalance: { increment: roundedAmount } },
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
      const proceeds = parseFloat((roundedAmount * price).toFixed(6))
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
    const meta = (error as any)?.meta
    console.error('[predikts/trade] error:', String(error), 'meta:', JSON.stringify(meta))
    const msg = meta ? `${String(error)} | field: ${JSON.stringify(meta)}` : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
