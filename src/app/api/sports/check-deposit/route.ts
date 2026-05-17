import { NextResponse } from 'next/server'
import { parseAbiItem } from 'viem'
import { db } from 'lib/db'
import { getPlatformAddress, getPublicClient } from 'lib/platform-wallet'

export const dynamic = 'force-dynamic'

// Polygon USDT (Tether USD — PoS bridge)
const USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as `0x${string}`
const TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')

// GET — scan recent Polygon blocks for USDT transfers from a user wallet to the platform wallet
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
    const fromBlock = currentBlock - BigInt(2000) // ~66 min of Polygon history

    const logs = await publicClient.getLogs({
      address: USDT_ADDRESS,
      event: TRANSFER_EVENT,
      args: {
        from: userAddress as `0x${string}`,
        to: platformAddress,
      },
      fromBlock,
      toBlock: 'latest',
    })

    const transfers = logs
      .filter((l) => l.transactionHash)
      .map((l) => ({
        txHash: l.transactionHash!,
        amountUsdt: Number(l.args.value ?? 0n) / 1e6,
      }))
      .filter((t) => t.amountUsdt > 0)

    if (transfers.length === 0) {
      return NextResponse.json({ found: false, credited: 0 })
    }

    let totalCredited = 0

    for (const { txHash, amountUsdt } of transfers) {
      const existing = await db.sportsDeposit.findUnique({ where: { txHash } })

      if (existing) continue

      await db.sportsUser.upsert({
        where: { walletAddress: userAddress },
        create: { walletAddress: userAddress, usdtBalance: amountUsdt },
        update: { usdtBalance: { increment: amountUsdt } },
      })

      const user = await db.sportsUser.findUnique({ where: { walletAddress: userAddress } })

      if (user) {
        await db.sportsDeposit.create({
          data: { userId: user.id, txHash, amountUsdt, status: 'confirmed' },
        })
      }

      totalCredited += amountUsdt
    }

    const user = await db.sportsUser.findUnique({
      where: { walletAddress: userAddress },
      select: { usdtBalance: true },
    })

    return NextResponse.json({
      found: totalCredited > 0,
      credited: totalCredited,
      newBalance: Number(user?.usdtBalance ?? 0),
    })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
