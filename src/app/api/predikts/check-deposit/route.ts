import { NextResponse } from 'next/server'
import { parseAbiItem } from 'viem'
import { db } from 'lib/db'
import { getPublicClient, autoWrapIfNeeded } from 'lib/platform-wallet'
import { sweepDepositWallet } from 'lib/deposit-wallet'

export const dynamic = 'force-dynamic'

const NATIVE_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as `0x${string}`
const USDC_E_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`
const NATIVE_USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as `0x${string}`
const TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')

const TOKEN_MAP: Record<string, string> = {
  [NATIVE_USDC_ADDRESS.toLowerCase()]: 'USDC',
  [USDC_E_ADDRESS.toLowerCase()]: 'USDC',
  [NATIVE_USDT_ADDRESS.toLowerCase()]: 'USDT',
}

// GET — scan recent Polygon blocks for USDC or USDT transfers TO the user's unique deposit address.
// Works for exchange withdrawals (where the sender is an exchange hot wallet, not the user's address).
// Polled every 30s by the deposit modal.
// Query params: ?userAddress=0x...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('userAddress')?.toLowerCase()

    if (!userAddress) {
      return NextResponse.json({ error: 'Missing userAddress' }, { status: 400 })
    }

    const user = await db.prediktsUser.findUnique({
      where: { walletAddress: userAddress },
      select: { id: true, depositAddress: true, depositPrivKey: true, usdBalance: true },
    })

    if (!user?.depositAddress) {
      return NextResponse.json({ found: false, credited: 0 })
    }

    const depositAddress = user.depositAddress as `0x${string}`
    const publicClient = getPublicClient()
    const currentBlock = await publicClient.getBlockNumber()
    const fromBlock = currentBlock - BigInt(2000)

    const transfers: { txHash: string; amountUsd: number; token: string }[] = []

    for (const tokenAddress of [NATIVE_USDC_ADDRESS, USDC_E_ADDRESS, NATIVE_USDT_ADDRESS]) {
      const logs = await publicClient.getLogs({
        address: tokenAddress,
        event: TRANSFER_EVENT,
        args: { to: depositAddress },  // Any sender — works for exchange withdrawals
        fromBlock,
        toBlock: 'latest',
      })

      for (const log of logs) {
        if (!log.transactionHash) continue
        const amountUsd = Number(log.args.value ?? 0n) / 1e6
        const token = TOKEN_MAP[tokenAddress.toLowerCase()] ?? 'USDC'

        if (amountUsd > 0) {
          transfers.push({ txHash: log.transactionHash, amountUsd, token })
        }
      }
    }

    if (transfers.length === 0) {
      return NextResponse.json({ found: false, credited: 0 })
    }

    let totalCredited = 0

    for (const { txHash, amountUsd, token } of transfers) {
      const existing = await db.prediktsDeposit.findUnique({ where: { txHash } })

      if (existing) continue

      await db.prediktsUser.update({
        where: { id: user.id },
        data: { usdBalance: { increment: amountUsd } },
      })

      await db.prediktsDeposit.create({
        data: { userId: user.id, txHash, amountUsd, token, status: 'confirmed' },
      })

      totalCredited += amountUsd
    }

    if (totalCredited > 0) {
      // Sweep deposited funds from user's unique wallet → platform trading wallet
      if (user.depositAddress && user.depositPrivKey) {
        sweepDepositWallet(user.depositAddress, user.depositPrivKey).catch(console.error)
      }
      autoWrapIfNeeded().catch(console.error)
    }

    const updated = await db.prediktsUser.findUnique({
      where: { id: user.id },
      select: { usdBalance: true },
    })

    return NextResponse.json({
      found: totalCredited > 0,
      credited: totalCredited,
      newBalance: Number(updated?.usdBalance ?? 0),
    })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
