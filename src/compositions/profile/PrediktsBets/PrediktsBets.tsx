'use client'

import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import cx from 'classnames'
import { useWallet } from 'wallet'
import EmptyContent from 'compositions/EmptyContent/EmptyContent'


type DbOrder = {
  id: string
  tokenId: string
  marketQuestion: string | null
  side: string
  amount: string
  price: number
  orderType: string
  status: string
  polyOrderId: string | null
  createdAt: string
}

const isMatchedStatus = (status: string) => status.toLowerCase() === 'matched'
const isFailedStatus = (status: string) => status.toLowerCase() === 'failed'

const statusLabel = (status: string) => {
  if (isMatchedStatus(status)) return 'Filled'
  if (isFailedStatus(status)) return 'Failed'
  if (status.toLowerCase() === 'pending') return 'Pending'
  return status
}

const marketTitle = (order: DbOrder) => {
  if (order.marketQuestion) return order.marketQuestion
  return `Market · ${order.tokenId.slice(0, 10)}…`
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
      {orders.map((order) => {
        const shares = Number(order.amount) / order.price
        const isMatched = isMatchedStatus(order.status)
        const isFailed = isFailedStatus(order.status)
        const isBuy = order.side === 'BUY'

        return (
          <div key={order.id} className="rounded-md bg-bg-l2 px-1">
            {/* Order header */}
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
                  'bg-accent-green/15 text-accent-green': isMatched,
                  'bg-accent-red/15 text-accent-red': isFailed,
                  'bg-grey-20/30 text-grey-60': !isMatched && !isFailed,
                })}
              >
                {statusLabel(order.status)}
              </span>
            </div>

            {/* Market + stats */}
            <div className="mx-1 mb-1 rounded-sm bg-bg-l3 px-3 py-3">
              <div className="text-caption-13 font-semibold text-grey-90 line-clamp-2">
                {marketTitle(order)}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-caption-12">
                <div>
                  <div className="text-grey-60">Amount</div>
                  <div className="mt-0.5 font-semibold text-grey-90">${Number(order.amount).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-grey-60">Price</div>
                  <div className="mt-0.5 font-semibold text-grey-90">{Math.round(order.price * 100)}¢</div>
                </div>
                <div>
                  <div className="text-grey-60">{isBuy ? 'Est. win' : 'Proceeds'}</div>
                  <div className={cx('mt-0.5 font-semibold', isMatched ? 'text-accent-green' : 'text-grey-90')}>
                    {isBuy ? `$${shares.toFixed(2)}` : `$${(Number(order.amount) * order.price).toFixed(2)}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default PrediktsBets
