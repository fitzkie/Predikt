'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import cx from 'classnames'
import { useWallet } from 'wallet'
import EmptyContent from 'compositions/EmptyContent/EmptyContent'
import { Href } from 'components/navigation'


type DbOrder = {
  id: string
  tokenId: string
  marketQuestion: string | null
  marketSlug: string | null
  side: string
  amount: string  // BUY → USD spent; SELL → shares sold
  price: number
  orderType: string
  status: string
  polyOrderId: string | null
  createdAt: string
}

const isMatchedStatus = (status: string) => status.toLowerCase() === 'matched'
const isFailedStatus = (status: string) => status.toLowerCase() === 'failed'

const marketTitle = (order: DbOrder) => {
  if (order.marketQuestion) return order.marketQuestion
  return `Market · ${order.tokenId.slice(0, 10)}…`
}

// Derive a smarter status label:
// - BUY Filled + a subsequent SELL Filled exists for same tokenId → "Exited"
// - BUY Filled with no sell → "Open"
// - SELL Filled → "Sold"
// - pending / failed → as-is
const computeStatus = (order: DbOrder, allOrders: DbOrder[]): { label: string; color: 'green' | 'red' | 'grey' } => {
  const matched = isMatchedStatus(order.status)
  const failed = isFailedStatus(order.status)

  if (failed) return { label: 'Failed', color: 'red' }

  if (order.side === 'SELL') {
    if (matched) return { label: 'Sold', color: 'green' }
    return { label: 'Pending', color: 'grey' }
  }

  // BUY order
  if (!matched) return { label: 'Pending', color: 'grey' }

  // Net shares: total bought minus total sold
  const totalBought = allOrders
    .filter((o) => o.tokenId === order.tokenId && o.side === 'BUY' && isMatchedStatus(o.status))
    .reduce((sum, o) => sum + Number(o.amount) / o.price, 0)
  const totalSold = allOrders
    .filter((o) => o.tokenId === order.tokenId && o.side === 'SELL' && isMatchedStatus(o.status))
    .reduce((sum, o) => sum + Number(o.amount), 0)
  const netShares = totalBought - totalSold

  if (netShares > 0.05) return { label: 'Open', color: 'green' }
  return { label: 'Exited', color: 'grey' }
}

const PrediktsBets: React.FC = () => {
  const { account } = useWallet()

  const { data: orders = [], isLoading } = useQuery<DbOrder[]>({
    queryKey: [ 'predikts', 'orders', 'user', account?.toLowerCase() ],
    queryFn: async () => {
      const res = await fetch(`/api/predikts/orders?userAddress=${account}`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: Boolean(account),
    staleTime: 15_000,
  })

  const ordersWithStatus = useMemo(
    () => orders.map((order) => ({ order, computed: computeStatus(order, orders) })),
    [ orders ]
  )

  if (isLoading) {
    return (
      <div className="space-y-2 px-1">
        {[1, 2].map((n) => (
          <div key={n} className="rounded-md bg-bg-l2 px-3 py-3">
            <div className="h-4 w-24 bone rounded-sm" />
            <div className="mt-2 h-5 w-2/3 bone rounded-sm" />
          </div>
        ))}
      </div>
    )
  }

  if (!orders.length) {
    return (
      <EmptyContent
        className="py-10"
        image="/images/illustrations/smile_sad.png"
        title={{ en: 'No predictions yet' }}
        text={{ en: 'Your prediction market trades will appear here.' }}
      />
    )
  }

  return (
    <div className="space-y-2">
      {ordersWithStatus.map(({ order, computed }) => {
        const isBuy = order.side === 'BUY'
        // BUY: amount = USD spent, shares = amount / price
        // SELL: amount = shares sold, proceeds = shares × price
        const buyShares = isBuy ? Number(order.amount) / order.price : 0
        const sellProceeds = !isBuy ? Number(order.amount) * order.price : 0

        const cardContent = (
          <>
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center text-caption-13 gap-2">
                <span className={cx('font-semibold uppercase', isBuy ? 'text-accent-green' : 'text-accent-red')}>
                  {order.side}
                </span>
                <div className="size-1 flex-none bg-grey-20 rounded-full" />
                <span className="text-grey-60">
                  {dayjs(order.createdAt).format('DD.MM.YYYY, HH:mm')}
                </span>
              </div>
              <span
                className={cx('text-caption-12 font-semibold rounded-full px-2 py-0.5', {
                  'bg-accent-green/15 text-accent-green': computed.color === 'green',
                  'bg-accent-red/15 text-accent-red': computed.color === 'red',
                  'bg-grey-20/30 text-grey-60': computed.color === 'grey',
                })}
              >
                {computed.label}
              </span>
            </div>

            <div className="mx-1 mb-1 rounded-sm bg-bg-l3 px-3 py-3">
              <div className="text-caption-13 font-semibold text-grey-90 line-clamp-2">
                {marketTitle(order)}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-caption-12">
                {isBuy ? (
                  <>
                    <div>
                      <div className="text-grey-60">Spent</div>
                      <div className="mt-0.5 font-semibold text-grey-90">${Number(order.amount).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-grey-60">Price</div>
                      <div className="mt-0.5 font-semibold text-grey-90">{Math.round(order.price * 100)}¢</div>
                    </div>
                    <div>
                      <div className="text-grey-60">Max win</div>
                      <div className={cx('mt-0.5 font-semibold', computed.label === 'Open' ? 'text-accent-green' : 'text-grey-70')}>
                        ${buyShares.toFixed(2)}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-grey-60">Shares</div>
                      <div className="mt-0.5 font-semibold text-grey-90">{Number(order.amount).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-grey-60">At</div>
                      <div className="mt-0.5 font-semibold text-grey-90">{Math.round(order.price * 100)}¢</div>
                    </div>
                    <div>
                      <div className="text-grey-60">Proceeds</div>
                      <div className={cx('mt-0.5 font-semibold', isMatchedStatus(order.status) ? 'text-accent-green' : 'text-grey-70')}>
                        ${sellProceeds.toFixed(2)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )

        return order.marketSlug ? (
          <Href key={order.id} className="block rounded-md bg-bg-l2 px-1 hover:bg-bg-l3 transition-colors" to={`/predikts/${order.marketSlug}`}>
            {cardContent}
          </Href>
        ) : (
          <div key={order.id} className="rounded-md bg-bg-l2 px-1">
            {cardContent}
          </div>
        )
      })}
    </div>
  )
}

export default PrediktsBets
