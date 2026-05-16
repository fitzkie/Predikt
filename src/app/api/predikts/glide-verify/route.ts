import { NextResponse } from 'next/server'
import { getSessionById } from '@paywithglide/glide-js'
import { glideConfig, POLYGON_NATIVE_USDC } from 'lib/glide'
import { db } from 'lib/db'
import { autoWrapIfNeeded } from 'lib/platform-wallet'

export const dynamic = 'force-dynamic'

// POST — verify a completed Glide payment session and credit the user's balance.
// Called by the frontend's onSuccess callback with the payment session ID.
// Idempotent: safe to call multiple times for the same session.
// Body: { sessionId, userAddress }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, userAddress } = body

    if (!sessionId || !userAddress) {
      return NextResponse.json({ error: 'Missing sessionId or userAddress' }, { status: 400 })
    }

    const session = await getSessionById(glideConfig, sessionId)

    if (session.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: `Payment not completed. Status: ${session.paymentStatus}` },
        { status: 400 }
      )
    }

    // Verify the settlement was in native USDC on Polygon
    if (session.sponsoredTransactionCurrency !== POLYGON_NATIVE_USDC) {
      return NextResponse.json(
        { error: `Unexpected settlement currency: ${session.sponsoredTransactionCurrency}` },
        { status: 400 }
      )
    }

    const amountUsdc = parseFloat(session.sponsoredTransactionAmount || '0')

    if (amountUsdc <= 0) {
      return NextResponse.json({ error: 'Settled amount is zero' }, { status: 400 })
    }

    const normalizedAddress = userAddress.toLowerCase()
    // Use the on-chain fulfillment tx as idempotency key, fall back to payment session ID
    const txHash = (session as any).sponsoredTransactionHash || sessionId

    const existing = await db.prediktsDeposit.findUnique({ where: { txHash } })

    if (existing) {
      const user = await db.prediktsUser.findUnique({
        where: { walletAddress: normalizedAddress },
        select: { pUsdBalance: true },
      })

      return NextResponse.json({ success: true, alreadyCredited: true, newBalance: Number(user?.pUsdBalance ?? 0) })
    }

    const user = await db.prediktsUser.upsert({
      where: { walletAddress: normalizedAddress },
      create: { walletAddress: normalizedAddress, pUsdBalance: amountUsdc },
      update: { pUsdBalance: { increment: amountUsdc } },
    })

    await db.prediktsDeposit.create({
      data: { userId: user.id, txHash, amountUsdc, status: 'confirmed' },
    })

    // Auto-wrap the received USDC → pUSD so the platform wallet can keep trading
    autoWrapIfNeeded().catch(console.error)

    const updatedUser = await db.prediktsUser.findUnique({
      where: { id: user.id },
      select: { pUsdBalance: true },
    })

    return NextResponse.json({ success: true, newBalance: Number(updatedUser?.pUsdBalance ?? 0) })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
