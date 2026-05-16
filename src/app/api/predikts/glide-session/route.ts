import { NextResponse } from 'next/server'
import { createWidgetSession } from '@paywithglide/glide-js'
import { glideConfig } from 'lib/glide'
import { getPlatformAddress } from 'lib/platform-wallet'

export const dynamic = 'force-dynamic'

// POST — create a Glide widget session so the user can deposit from any source.
// The session locks the recipient to the platform wallet; the user picks the payment method.
// Body: { userAddress, amountUsdc }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userAddress, amountUsdc } = body

    if (!userAddress || !amountUsdc || amountUsdc <= 0) {
      return NextResponse.json({ error: 'Missing userAddress or amountUsdc' }, { status: 400 })
    }

    const session = await createWidgetSession(glideConfig, {
      mode: 'pay',
      recipient: getPlatformAddress(),
      // Store the user's requested amount in metadata so the verify step can credit correctly
      metadata: JSON.stringify({ userAddress: userAddress.toLowerCase(), amountUsdc }),
    })

    return NextResponse.json({ sessionId: session.id })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
