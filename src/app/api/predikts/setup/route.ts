import { NextResponse } from 'next/server'
import {
  derivePlatformCredentials,
  createBuilderApiKey,
  getPlatformAddress,
  getPlatformDepositWalletAddress,
  getPlatformOnChainBalances,
  getPlatformClobBalance,
  approveExchangeContracts,
  approveExchangesFromDepositWallet,
  approveCTFFromDepositWallet,
  checkDepositWalletDeployed,
  deployPlatformDepositWallet,
  transferPusdFromEoaToDepositWallet,
  wrapUsdcToPusd,
  updateClobBalance,
} from 'lib/platform-wallet'

export const dynamic = 'force-dynamic'


// GET — check platform wallet status (balances, credentials, deposit wallet)
export async function GET() {
  try {
    const address = getPlatformAddress()
    const depositWalletAddress = getPlatformDepositWalletAddress()
    const onChain = await getPlatformOnChainBalances()
    const hasCredentials = !!(
      process.env.PLATFORM_CLOB_KEY &&
      process.env.PLATFORM_CLOB_SECRET &&
      process.env.PLATFORM_CLOB_PASSPHRASE
    )

    let clobBalance: number | null = null
    let depositWalletDeployed: boolean | null = null

    if (hasCredentials) {
      try {
        clobBalance = await getPlatformClobBalance()
      }
      catch (e) {
        clobBalance = null
      }
    }

    try {
      depositWalletDeployed = await checkDepositWalletDeployed()
    }
    catch (e) {
      depositWalletDeployed = null
    }

    return NextResponse.json({
      address,
      depositWalletAddress,
      depositWalletDeployed,
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

    if (action === 'create-builder-api-key') {
      const creds = await createBuilderApiKey()

      return NextResponse.json({
        message: 'Builder API key created. Add these as Railway env vars: PLATFORM_BUILDER_KEY, PLATFORM_BUILDER_SECRET, PLATFORM_BUILDER_PASSPHRASE, then redeploy.',
        key: creds.key,
        secret: creds.secret,
        passphrase: creds.passphrase,
      })
    }

    if (action === 'deploy-deposit-wallet') {
      const result = await deployPlatformDepositWallet()

      return NextResponse.json({
        message: result.deployed
          ? 'Deposit wallet deployed and confirmed on-chain.'
          : 'Deploy submitted — may still be confirming. Click Check Status in 30s.',
        ...result,
      })
    }

    if (action === 'check-deposit-wallet') {
      const depositWalletAddress = getPlatformDepositWalletAddress()
      const deployed = await checkDepositWalletDeployed()

      return NextResponse.json({ depositWalletAddress, deployed })
    }

    if (action === 'approve-from-deposit-wallet') {
      const result = await approveExchangesFromDepositWallet()

      return NextResponse.json({ message: 'Exchange approvals submitted from deposit wallet.', ...result })
    }

    if (action === 'approve-ctf-from-deposit-wallet') {
      const result = await approveCTFFromDepositWallet()

      return NextResponse.json({ message: 'CTF setApprovalForAll submitted — required to sell outcome shares.', ...result })
    }

    if (action === 'transfer-pusd-to-deposit-wallet') {
      const result = await transferPusdFromEoaToDepositWallet()

      return NextResponse.json({ message: `Transferred ${result.transferred} pUSD from EOA to deposit wallet.`, ...result })
    }

    // Legacy: EOA-level exchange approvals (no longer effective for trading since April 2026)
    if (action === 'approve-exchanges') {
      const receipts = await approveExchangeContracts()

      return NextResponse.json({ message: 'Exchange approvals confirmed (EOA — see approve-from-deposit-wallet for trading).', receipts })
    }

    if (action === 'wrap-usdc') {
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'amount required for wrap-usdc' }, { status: 400 })
      }

      const result = await wrapUsdcToPusd(amount)

      return NextResponse.json({ message: `Wrapped ${amount} USDC to pUSD (minted to deposit wallet).`, ...result })
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
