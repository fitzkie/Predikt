import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { db } from 'lib/db'
import { autoWrapIfNeeded } from 'lib/platform-wallet'

export const dynamic = 'force-dynamic'

// Transak signature: HMAC-SHA256 of JSON.stringify(webhookData) using the API secret.
// The `signature` field is in the request body alongside `webhookData`.
function verifySignature(webhookData: unknown, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret)
    .update(JSON.stringify(webhookData))
    .digest('hex')

  return expected === signature
}

// POST — receives Transak order status events.
// Configure in Transak dashboard: https://YOUR_DOMAIN/api/predikts/transak-webhook
// Only acts on status=COMPLETED for USDC on Polygon.
// partnerOrderId must be the user's wallet address (set when opening the widget).
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { webhookData, signature } = body

    if (!webhookData) {
      return NextResponse.json({ error: 'Missing webhookData' }, { status: 400 })
    }

    // Verify signature if secret is configured
    const secret = process.env.TRANSAK_API_SECRET

    if (secret) {
      if (!signature || !verifySignature(webhookData, signature, secret)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const {
      id: orderId,
      status,
      cryptoAmount,
      cryptoCurrency,
      network,
      partnerOrderId,
      transactionHash,
    } = webhookData

    // Only process completed BUY orders of USDC on Polygon
    if (status !== 'COMPLETED' || cryptoCurrency !== 'USDC' || network?.toLowerCase() !== 'polygon') {
      return NextResponse.json({ ok: true, skipped: true, status })
    }

    const userAddress = (partnerOrderId as string | undefined)?.toLowerCase()

    if (!userAddress || !orderId || !cryptoAmount) {
      return NextResponse.json({ error: 'Missing required fields: partnerOrderId, orderId, or cryptoAmount' }, { status: 400 })
    }

    // Idempotency — Transak may retry; use order ID as the unique txHash
    const txHash = `transak-${orderId}`
    const existing = await db.prediktsDeposit.findUnique({ where: { txHash } })

    if (existing) {
      return NextResponse.json({ ok: true, alreadyCredited: true })
    }

    const amountUsdc = Number(cryptoAmount)

    const user = await db.prediktsUser.upsert({
      where: { walletAddress: userAddress },
      create: { walletAddress: userAddress, pUsdBalance: amountUsdc },
      update: { pUsdBalance: { increment: amountUsdc } },
    })

    await db.prediktsDeposit.create({
      data: {
        userId: user.id,
        txHash,
        amountUsdc,
        status: 'confirmed',
      },
    })

    // Wrap newly arrived USDC into pUSD (fire-and-forget)
    autoWrapIfNeeded().catch(console.error)

    return NextResponse.json({ ok: true, credited: amountUsdc, userAddress })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
