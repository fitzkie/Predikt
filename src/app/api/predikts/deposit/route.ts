import { NextResponse } from 'next/server'
import { db } from 'lib/db'
import { getPlatformAddress } from 'lib/platform-wallet'

export const dynamic = 'force-dynamic'


// GET — returns the platform deposit address so the UI can display it
export async function GET() {
  return NextResponse.json({ depositAddress: getPlatformAddress() })
}

// POST — manually credit a user's balance (admin use, or called after verifying a tx)
// Body: { userAddress, amountUsdc, txHash }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userAddress, amountUsdc, txHash } = body

    if (!userAddress || !amountUsdc || !txHash) {
      return NextResponse.json({ error: 'Missing required fields: userAddress, amountUsdc, txHash' }, { status: 400 })
    }

    const normalizedAddress = userAddress.toLowerCase()

    // Idempotent: skip if this tx was already processed
    const existing = await db.prediktsDeposit.findUnique({ where: { txHash } })

    if (existing) {
      return NextResponse.json({ error: 'Deposit already recorded.' }, { status: 409 })
    }

    const user = await db.prediktsUser.upsert({
      where: { walletAddress: normalizedAddress },
      create: { walletAddress: normalizedAddress, pUsdBalance: amountUsdc },
      update: { pUsdBalance: { increment: amountUsdc } },
    })

    await db.prediktsDeposit.create({
      data: { userId: user.id, txHash, amountUsdc, status: 'confirmed' },
    })

    return NextResponse.json({ success: true, newBalance: Number(user.pUsdBalance) + amountUsdc })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
