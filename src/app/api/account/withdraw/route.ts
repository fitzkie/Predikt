import { NextResponse } from 'next/server'
import { db } from 'lib/db'
import { sendTokenToUser } from 'lib/platform-wallet'

export const dynamic = 'force-dynamic'


// GET — list withdrawals for a wallet
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')?.toLowerCase()

    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 })
    }

    const withdrawals = await db.withdrawal.findMany({
      where: { walletAddress: address },
      orderBy: { createdAt: 'desc' },
    })

    const totalCompleted = withdrawals
      .filter((w) => w.status === 'completed')
      .reduce((sum, w) => sum + Number(w.amountUsd), 0)

    return NextResponse.json({ withdrawals, totalCompleted })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST — withdraw funds: deduct from DB balance, send USDC/USDT on-chain to user's wallet
// Body: { walletAddress, amountUsd, token? }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { walletAddress, amountUsd, token = 'USDC' } = body

    if (!walletAddress || !amountUsd) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, amountUsd' },
        { status: 400 }
      )
    }

    if (!['USDC', 'USDT'].includes(token)) {
      return NextResponse.json({ error: 'token must be USDC or USDT' }, { status: 400 })
    }

    const address = walletAddress.toLowerCase()

    const user = await db.prediktsUser.findUnique({
      where: { walletAddress: address },
      select: { id: true, usdBalance: true },
    })

    if (!user || Number(user.usdBalance) < amountUsd) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: $${Number(user?.usdBalance ?? 0).toFixed(2)}` },
        { status: 400 }
      )
    }

    // Deduct first — prevents double-spend
    await db.prediktsUser.update({
      where: { id: user.id },
      data: { usdBalance: { decrement: amountUsd } },
    })

    // Record as pending while we send on-chain
    const withdrawal = await db.withdrawal.create({
      data: { walletAddress: address, source: 'platform', amountUsd, token, status: 'processing' },
    })

    try {
      const txHash = await sendTokenToUser(address, amountUsd, token as 'USDC' | 'USDT')

      await db.withdrawal.update({
        where: { id: withdrawal.id },
        data: { txHash, status: 'completed' },
      })

      return NextResponse.json({ success: true, txHash, withdrawalId: withdrawal.id })
    }
    catch (transferErr) {
      // Refund balance if on-chain send failed
      await db.prediktsUser.update({
        where: { id: user.id },
        data: { usdBalance: { increment: amountUsd } },
      })
      await db.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: 'failed' },
      })

      return NextResponse.json({ error: String(transferErr) }, { status: 502 })
    }
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
