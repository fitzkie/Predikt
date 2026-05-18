import crypto from 'crypto'
import { createWalletClient, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { polygon } from 'viem/chains'
import { getBetTypedData, createBet, getBetFee, calcMinOdds, ODDS_DECIMALS } from '@azuro-org/toolkit'

const CHAIN_ID = 137 as const
const CORE_ADDRESS = '0xF9548Be470A4e130c90ceA8b179FCD66D2972AC7' as `0x${string}`
const USDT_DECIMALS = 6
const ATTENTION = 'By signing this transaction, I agree to place a bet for an event on Azuro Protocol'
const RPC = 'https://polygon-bor-rpc.publicnode.com'

export type AzuroBetResult = {
  success: boolean
  azuroBetId?: string
  txHash?: string
  error?: string
}

export async function placeCustodialBet(params: {
  conditionId: string
  outcomeId: string
  amountUsd: number
  currentOdds: number
  slippagePct?: number
}): Promise<AzuroBetResult> {
  const privateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY
  const affiliateAddress = process.env.NEXT_PUBLIC_AFFILIATE_ADDRESS as `0x${string}` | undefined

  if (!privateKey || !affiliateAddress) {
    return { success: false, error: 'Platform wallet not configured' }
  }

  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`)
    const walletClient = createWalletClient({
      account,
      chain: polygon,
      transport: http(RPC),
    })

    // 1. Get relayer fee from Azuro oracle API
    const feeData = await getBetFee(CHAIN_ID)

    // 2. Calculate minOdds with slippage using toolkit helper
    // calcMinOdds may return a decimal string like "1.070000000000" depending on
    // toolkit version — convert via float → round → BigInt to handle both formats.
    const slippage = params.slippagePct ?? 10
    const minOddsStr = calcMinOdds({ odds: params.currentOdds, slippage })
    const minOddsRaw = BigInt(Math.round(parseFloat(minOddsStr) * 10 ** ODDS_DECIMALS))

    // 3. Amount in USDT smallest units (6 decimals)
    const amountRaw = parseUnits(params.amountUsd.toFixed(6), USDT_DECIMALS)

    // 4. Random nonce (the Core contract tracks used nonces to prevent replays)
    const nonce = BigInt('0x' + crypto.randomBytes(16).toString('hex'))

    const clientData = {
      attention: ATTENTION,
      affiliate: affiliateAddress,
      core: CORE_ADDRESS,
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      chainId: CHAIN_ID,
      relayerFeeAmount: feeData.relayerFeeAmount,
      isFeeSponsored: false,
      isBetSponsored: false,
      isSponsoredBetReturnable: false,
    }

    const betInput = {
      conditionId: BigInt(params.conditionId),
      outcomeId: BigInt(params.outcomeId),
      minOdds: minOddsRaw,
      amount: amountRaw,
      nonce,
    }

    // 5. Build EIP-712 typed data
    const typedData = getBetTypedData({
      account: account.address,
      clientData,
      bet: betInput,
    })

    // 6. Sign with platform wallet (Azuro's oracle pays gas and submits on-chain)
    const signature = await walletClient.signTypedData({
      account,
      domain: typedData.domain as any,
      types: typedData.types as any,
      primaryType: typedData.primaryType as any,
      message: typedData.message as any,
    })

    // 7. Submit to Azuro oracle API
    const result = await createBet({
      account: account.address,
      clientData,
      bet: {
        conditionId: params.conditionId,
        outcomeId: Number(params.outcomeId),
        minOdds: minOddsStr,
        amount: String(amountRaw),
        nonce: String(nonce),
      },
      signature,
    }) as any

    return {
      success: true,
      azuroBetId: result?.betId ?? result?.id ?? result?.tokenId,
      txHash: result?.txHash,
    }
  }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[azuro-custodial] placeCustodialBet error:', message)
    return { success: false, error: message }
  }
}
