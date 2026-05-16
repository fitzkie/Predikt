import { NextResponse } from 'next/server'
import {
  derivePlatformCredentials,
  getPlatformAddress,
  getPlatformOnChainBalances,
  getPlatformClobBalance,
  approveExchangeContracts,
  wrapUsdcToPusd,
  updateClobBalance,
} from 'lib/platform-wallet'

export const dynamic = 'force-dynamic'


// GET — check platform wallet status (balances, credentials, approvals)
export async function GET() {
  try {
    const address = getPlatformAddress()
    const onChain = await getPlatformOnChainBalances()
    const hasCredentials = !!(
      process.env.PLATFORM_CLOB_KEY &&
      process.env.PLATFORM_CLOB_SECRET &&
      process.env.PLATFORM_CLOB_PASSPHRASE
    )

    let clobBalance: number | null = null

    if (hasCredentials) {
      try {
        clobBalance = await getPlatformClobBalance()
      }
      catch (e) {
        clobBalance = null
      }
    }

    return NextResponse.json({
      address,
      hasCredentials,
      onChain,
      clobBalance,
    })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST — run one-time setup steps
// Body: { action: 'derive-credentials' | 'approve-exchanges' | 'wrap-usdc', amount?: number }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, amount } = body

    if (action === 'derive-credentials') {
      const creds = await derivePlatformCredentials()

      return NextResponse.json({
        message: 'Credentials derived. Add these as Railway env vars: PLATFORM_CLOB_KEY, PLATFORM_CLOB_SECRET, PLATFORM_CLOB_PASSPHRASE',
        key: creds.key,
        secret: creds.secret,
        passphrase: creds.passphrase,
      })
    }

    if (action === 'approve-exchanges') {
      const receipts = await approveExchangeContracts()

      return NextResponse.json({ message: 'Exchange approvals confirmed.', receipts })
    }

    if (action === 'wrap-usdc') {
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'amount required for wrap-usdc' }, { status: 400 })
      }

      const result = await wrapUsdcToPusd(amount)

      return NextResponse.json({ message: `Wrapped ${amount} USDC to pUSD.`, ...result })
    }

    if (action === 'update-clob-balance') {
      const result = await updateClobBalance()

      return NextResponse.json({ message: 'CLOB balance updated.', result })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
