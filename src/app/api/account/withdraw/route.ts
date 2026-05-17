import { NextResponse } from 'next/server'
import { db } from 'lib/db'

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

// POST — record a withdrawal request
// Body: { walletAddress, source, amountUsd, token, txHash? }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { walletAddress, source, amountUsd, token, txHash } = body

    if (!walletAddress || !source || !amountUsd || !token) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, source, amountUsd, token' },
        { status: 400 }
      )
    }

    const address = walletAddress.toLowerCase()

    // Unified balance — deduct regardless of source
    const user = await db.prediktsUser.findUnique({
      where: { walletAddress: address },
      select: { usdBalance: true },
    })

    if (!user || Number(user.usdBalance) < amountUsd) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: $${Number(user?.usdBalance ?? 0).toFixed(2)}` },
        { status: 400 }
      )
    }

    await db.prediktsUser.update({
      where: { walletAddress: address },
      data: { usdBalance: { decrement: amountUsd } },
    })

    const withdrawal = await db.withdrawal.create({
      data: {
        walletAddress: address,
        source,
        amountUsd,
        token,
        txHash: txHash || null,
        status: txHash ? 'completed' : 'pending',
      },
    })

    return NextResponse.json({ success: true, withdrawal })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
