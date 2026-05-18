import { NextResponse } from 'next/server'
import { getPlatformAddress } from 'lib/platform-wallet'

export const dynamic = 'force-dynamic'

// POST — generate a Transak Secure Widget URL from the backend.
// All sensitive params (wallet address, order ID) are passed server-side.
// Body: { userAddress: string }
// Returns: { widgetUrl: string }
export async function POST(request: Request) {
  try {
    const { userAddress } = await request.json()

    if (!userAddress) {
      return NextResponse.json({ error: 'Missing userAddress' }, { status: 400 })
    }

    const apiKey = process.env.NEXT_PUBLIC_TRANSAK_API_KEY
    const accessToken = process.env.TRANSAK_API_SECRET

    if (!apiKey || !accessToken) {
      return NextResponse.json({ error: 'Transak not configured' }, { status: 500 })
    }

    const environment = process.env.NEXT_PUBLIC_TRANSAK_ENVIRONMENT ?? 'STAGING'
    const isProduction = environment === 'PRODUCTION'

    const sessionApiUrl = isProduction
      ? 'https://api-gateway.transak.com/api/v2/auth/session'
      : 'https://api-gateway-stg.transak.com/api/v2/auth/session'

    const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'predikt.railway.app'
    const referrerDomain = rawAppUrl.replace(/^https?:\/\//, '')

    const res = await fetch(sessionApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access-token': accessToken,
      },
      body: JSON.stringify({
        widgetParams: {
          apiKey,
          referrerDomain,
          productsAvailed: 'BUY',
          network: 'polygon',
          defaultNetwork: 'polygon',
          cryptoCurrencyCode: 'USDC',
          // Platform EOA receives the USDC; partnerOrderId maps back to the user
          walletAddress: getPlatformAddress(),
          partnerOrderId: userAddress.toLowerCase(),
          disableWalletAddressForm: 'true',
          defaultFiatAmount: '50',
          themeColor: 'C4FF48',
        },
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()

      return NextResponse.json({ error: `Transak session error: ${res.status} ${errorText}` }, { status: 502 })
    }

    const data = await res.json()
    const widgetUrl = data?.data?.widgetUrl

    if (!widgetUrl) {
      return NextResponse.json({ error: 'No widgetUrl in Transak response', raw: data }, { status: 502 })
    }

    return NextResponse.json({ widgetUrl })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
