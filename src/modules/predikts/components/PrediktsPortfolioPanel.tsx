'use client'

import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useWallet } from 'wallet'


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

const statusColor = (status: string) => {
  if (status === 'MATCHED' || status === 'matched') return 'text-accent-green'
  if (status === 'failed') return 'text-accent-red'
  return 'text-grey-60'
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

  if (ordersQuery.isLoading) {
    return null
  }

  const orders = (ordersQuery.data || []).slice(0, 6)

  if (!orders.length) {
    return null
  }

  return (
    <div className="rounded-lg border border-white/10 bg-bg-l2 p-5">
      <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">My Predikts</div>
      <div className="mt-4 space-y-2">
        {orders.map((order) => (
          <div key={order.id} className="rounded-md border border-white/10 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className={`text-caption-12 font-semibold uppercase ${order.side === 'BUY' ? 'text-accent-green' : 'text-accent-red'}`}>
                {order.side}
              </span>
              <span className={`text-caption-12 font-semibold ${statusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
            <div className="mt-1 text-caption-13 font-semibold text-grey-90 line-clamp-2">
              {order.marketQuestion || order.tokenId}
            </div>
            <div className="mt-1 flex items-center justify-between text-caption-12 text-grey-60">
              <span>${Number(order.amount).toFixed(2)} @ {(order.price * 100).toFixed(0)}¢</span>
              <span>{dayjs(order.createdAt).format('MMM D, HH:mm')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PrediktsPortfolioPanel
