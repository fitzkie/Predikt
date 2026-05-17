'use client'

import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import cx from 'classnames'
import { useWallet } from 'wallet'
import { Href } from 'components/navigation'


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

const statusLabel = (s: string) => {
  if (isMatchedStatus(s)) return 'filled'
  if (isFailedStatus(s)) return 'failed'
  return 'pending'
}

const marketTitle = (order: DbOrder) => {
  if (order.marketQuestion) return order.marketQuestion
  return `Market · ${order.tokenId.slice(0, 10)}…`
}

const PrediktsPortfolioPanel: React.FC = () => {
  const { account } = useWallet()

  const ordersQuery = useQuery<DbOrder[]>({
    queryKey: [ 'predikts', 'orders', 'user', account?.toLowerCase() ],
    queryFn: async () => {
      const res = await fetch(`/api/predikts/orders?userAddress=${account}`)

      if (!res.ok) return []

      return res.json()
    },
    enabled: Boolean(account),
    staleTime: 15_000,
  })

  if (ordersQuery.isLoading || !ordersQuery.data?.length) {
    return null
  }

  const orders = ordersQuery.data.slice(0, 5)

  return (
    <div className="rounded-lg border border-white/10 bg-bg-l2 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">My Predikts</div>
        <Href to="/profile?tab=predictions" className="text-caption-11 text-grey-50 hover:text-grey-90 transition-colors">
          View all
        </Href>
      </div>
      <div className="space-y-2">
        {orders.map((order) => {
          const isMatched = isMatchedStatus(order.status)
          const isFailed = isFailedStatus(order.status)
          const isBuy = order.side === 'BUY'
          const shares = Number(order.amount) / order.price

          return (
            <div key={order.id} className="rounded-md border border-white/10 bg-bg-l1 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className={cx('text-caption-12 font-bold uppercase', isBuy ? 'text-accent-green' : 'text-accent-red')}>
                  {order.side}
                </span>
                <span
                  className={cx('text-[10px] font-semibold rounded-full px-1.5 py-0.5', {
                    'bg-accent-green/15 text-accent-green': isMatched,
                    'bg-accent-red/15 text-accent-red': isFailed,
                    'bg-grey-20/30 text-grey-60': !isMatched && !isFailed,
                  })}
                >
                  {statusLabel(order.status)}
                </span>
              </div>
              <div className="mt-1 text-caption-12 font-semibold text-grey-90 line-clamp-2 leading-[1.4]">
                {marketTitle(order)}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-grey-60">
                <span>${Number(order.amount).toFixed(2)} @ {Math.round(order.price * 100)}¢</span>
                <span>{dayjs(order.createdAt).format('MMM D, HH:mm')}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PrediktsPortfolioPanel
