import { NextResponse } from 'next/server'
import { db } from 'lib/db'
import { getPlatformOpenOrders } from 'lib/platform-wallet'

export const dynamic = 'force-dynamic'


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('userAddress')
    const tokenIdsParam = searchParams.get('tokenIds')
    const tokenIds = tokenIdsParam ? tokenIdsParam.split(',').filter(Boolean) : undefined

    if (userAddress) {
      const user = await db.prediktsUser.findUnique({
        where: { walletAddress: userAddress.toLowerCase() },
        include: {
          orders: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            where: tokenIds?.length ? { tokenId: { in: tokenIds } } : undefined,
          },
        },
      })

      return NextResponse.json(user?.orders || [])
    }

    const orders = await getPlatformOpenOrders(tokenIds)

    return NextResponse.json(orders)
  }
  catch (error) {
    return NextResponse.json([], { status: 200 })
  }
}
