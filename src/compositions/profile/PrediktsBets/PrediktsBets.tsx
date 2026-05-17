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

const statusLabel = (status: string) => {
  if (status === 'MATCHED' || status === 'matched') return 'Filled'
  if (status === 'failed') return 'Failed'
  if (status === 'pending') return 'Pending'
  return status
}

const statusClass = (status: string) => {
  if (status === 'MATCHED' || status === 'matched') return 'text-accent-green'
  if (status === 'failed') return 'text-accent-red'
  return 'text-grey-60'
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
      <div className="rounded-md bg-bg-l2 p-4">
        <div className="h-4 w-32 bone rounded-sm" />
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
      {orders.map((order) => (
        <div key={order.id} className="rounded-md bg-bg-l2 px-1">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center text-caption-13 gap-2">
              <span className={cx('font-semibold uppercase', order.side === 'BUY' ? 'text-accent-green' : 'text-accent-red')}>
                {order.side}
              </span>
              <span className="text-grey-60">{dayjs(order.createdAt).format('DD.MM.YYYY, HH:mm')}</span>
            </div>
            <span className={cx('text-caption-12 font-semibold', statusClass(order.status))}>
              {statusLabel(order.status)}
            </span>
          </div>
          <div className="mx-1 mb-1 rounded-sm bg-bg-l3 px-3 py-3">
            <div className="text-caption-13 font-semibold text-grey-90 line-clamp-2">
              {order.marketQuestion || order.tokenId}
            </div>
            <div className="mt-2 flex items-center justify-between text-caption-12 text-grey-60">
              <span>Amount: ${Number(order.amount).toFixed(2)}</span>
              <span>Price: {(order.price * 100).toFixed(0)}¢</span>
              <span>Est. win: ${(Number(order.amount) / order.price).toFixed(2)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default PrediktsBets
