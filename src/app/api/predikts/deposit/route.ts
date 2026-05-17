import { NextResponse } from 'next/server'
import { db } from 'lib/db'
import { getPlatformAddress } from 'lib/platform-wallet'

export const dynamic = 'force-dynamic'


// GET — returns the platform deposit address so the UI can display it
export async function GET() {
  return NextResponse.json({ depositAddress: getPlatformAddress() })
}

// POST — credit a user's unified USD balance after a confirmed deposit
// Body: { userAddress, amountUsd, txHash, token? }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    // Accept both legacy `amountUsdc` and new `amountUsd` field names
    const { userAddress, txHash, token = 'USDC' } = body
    const amountUsd = body.amountUsd ?? body.amountUsdc

    if (!userAddress || !amountUsd || !txHash) {
      return NextResponse.json({ error: 'Missing required fields: userAddress, amountUsd, txHash' }, { status: 400 })
    }

    const normalizedAddress = userAddress.toLowerCase()

    const existing = await db.prediktsDeposit.findUnique({ where: { txHash } })

    if (existing) {
      return NextResponse.json({ error: 'Deposit already recorded.' }, { status: 409 })
    }

    const user = await db.prediktsUser.upsert({
      where: { walletAddress: normalizedAddress },
      create: { walletAddress: normalizedAddress, usdBalance: amountUsd },
      update: { usdBalance: { increment: amountUsd } },
    })

    await db.prediktsDeposit.create({
      data: { userId: user.id, txHash, amountUsd, token, status: 'confirmed' },
    })

    const updated = await db.prediktsUser.findUnique({
      where: { id: user.id },
      select: { usdBalance: true },
    })

    return NextResponse.json({ success: true, newBalance: Number(updated?.usdBalance ?? 0) })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
