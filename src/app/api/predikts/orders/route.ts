import { NextResponse } from 'next/server'
import { getPlatformOpenOrders } from 'lib/platform-wallet'

export const dynamic = 'force-dynamic'


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tokenIdsParam = searchParams.get('tokenIds')
    const tokenIds = tokenIdsParam ? tokenIdsParam.split(',').filter(Boolean) : undefined

    const orders = await getPlatformOpenOrders(tokenIds)

    return NextResponse.json(orders)
  }
  catch (error) {
    return NextResponse.json([], { status: 200 })
  }
}
