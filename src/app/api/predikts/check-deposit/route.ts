import { NextResponse } from 'next/server'
import { parseAbiItem } from 'viem'
import { db } from 'lib/db'
import { getPlatformAddress, getPublicClient, autoWrapIfNeeded } from 'lib/platform-wallet'

export const dynamic = 'force-dynamic'

const NATIVE_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as `0x${string}`
const USDC_E_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`
const TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')

// GET — scan recent Polygon blocks for USDC transfers from a user wallet to the platform wallet.
// If any are found that haven't been credited yet, credits them automatically.
// Polled by the frontend deposit modal every 30s while the "Send directly" tab is open.
// Query params: ?userAddress=0x...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('userAddress')?.toLowerCase()

    if (!userAddress) {
      return NextResponse.json({ error: 'Missing userAddress' }, { status: 400 })
    }

    const platformAddress = getPlatformAddress() as `0x${string}`
    const publicClient = getPublicClient()
    const currentBlock = await publicClient.getBlockNumber()
    // ~2000 blocks ≈ 66 minutes of Polygon history — enough for any in-progress deposit
    const fromBlock = currentBlock - BigInt(2000)

    const transfers: { txHash: string; amountUsdc: number }[] = []

    for (const tokenAddress of [NATIVE_USDC_ADDRESS, USDC_E_ADDRESS]) {
      const logs = await publicClient.getLogs({
        address: tokenAddress,
        event: TRANSFER_EVENT,
        args: {
          from: userAddress as `0x${string}`,
          to: platformAddress,
        },
        fromBlock,
        toBlock: 'latest',
      })

      for (const log of logs) {
        if (!log.transactionHash) continue
        const amountUsdc = Number(log.args.value ?? 0n) / 1e6

        if (amountUsdc > 0) {
          transfers.push({ txHash: log.transactionHash, amountUsdc })
        }
      }
    }

    if (transfers.length === 0) {
      return NextResponse.json({ found: false, credited: 0 })
    }

    let totalCredited = 0

    for (const { txHash, amountUsdc } of transfers) {
      const existing = await db.prediktsDeposit.findUnique({ where: { txHash } })

      if (existing) continue

      const user = await db.prediktsUser.upsert({
        where: { walletAddress: userAddress },
        create: { walletAddress: userAddress, pUsdBalance: amountUsdc },
        update: { pUsdBalance: { increment: amountUsdc } },
      })

      await db.prediktsDeposit.create({
        data: { userId: user.id, txHash, amountUsdc, status: 'confirmed' },
      })

      totalCredited += amountUsdc
    }

    if (totalCredited > 0) {
      autoWrapIfNeeded().catch(console.error)
    }

    const user = await db.prediktsUser.findUnique({
      where: { walletAddress: userAddress },
      select: { pUsdBalance: true },
    })

    return NextResponse.json({
      found: totalCredited > 0,
      credited: totalCredited,
      newBalance: Number(user?.pUsdBalance ?? 0),
    })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
