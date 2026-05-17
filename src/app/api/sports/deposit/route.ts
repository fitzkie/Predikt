import { NextResponse } from 'next/server'
import { db } from 'lib/db'
import { getPlatformAddress } from 'lib/platform-wallet'

export const dynamic = 'force-dynamic'


// GET — returns the platform deposit address for USDT (same wallet as Predikts)
export async function GET() {
  return NextResponse.json({ depositAddress: getPlatformAddress() })
}

// POST — credit a sports user's USDT balance after a confirmed deposit
// Body: { userAddress, amountUsdt, txHash }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userAddress, amountUsdt, txHash } = body

    if (!userAddress || !amountUsdt || !txHash) {
      return NextResponse.json({ error: 'Missing required fields: userAddress, amountUsdt, txHash' }, { status: 400 })
    }

    const normalizedAddress = userAddress.toLowerCase()

    const existing = await db.sportsDeposit.findUnique({ where: { txHash } })

    if (existing) {
      return NextResponse.json({ error: 'Deposit already recorded.' }, { status: 409 })
    }

    const user = await db.sportsUser.upsert({
      where: { walletAddress: normalizedAddress },
      create: { walletAddress: normalizedAddress, usdtBalance: amountUsdt },
      update: { usdtBalance: { increment: amountUsdt } },
    })

    await db.sportsDeposit.create({
      data: { userId: user.id, txHash, amountUsdt, status: 'confirmed' },
    })

    const updated = await db.sportsUser.findUnique({
      where: { walletAddress: normalizedAddress },
      select: { usdtBalance: true },
    })

    return NextResponse.json({ success: true, newBalance: Number(updated?.usdtBalance ?? 0) })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
