'use client'

import { usePolymarketActivity, usePolymarketPositions } from 'providers/polymarket'
import { useWallet } from 'wallet'


const formatCurrency = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '$0'
  }

  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

const PrediktsPortfolioPanel: React.FC = () => {
  const { account } = useWallet()
  const positionsQuery = usePolymarketPositions(account)
  const activityQuery = usePolymarketActivity(account)

  const positions = (positionsQuery.data || []).slice(0, 3)
  const activity = (activityQuery.data || []).slice(0, 4)

  if (!positions.length && !activity.length) {
    return null
  }

  return (
    <div className="space-y-2">
      {positions.length ? (
        <div className="rounded-lg border border-white/10 bg-bg-l2 p-5">
          <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">Portfolio</div>
          <div className="mt-4 space-y-3">
            {positions.map((position) => (
              <div key={`${position.conditionId}-${position.asset}`} className="rounded-md border border-white/10 px-3 py-3">
                <div className="text-caption-13 font-semibold text-grey-90 line-clamp-2">{position.title}</div>
                <div className="mt-2 flex items-center justify-between text-caption-12 text-grey-60">
                  <span>{position.outcome}</span>
                  <span>{formatCurrency(position.currentValue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {activity.length ? (
        <div className="rounded-lg border border-white/10 bg-bg-l2 p-5">
          <div className="text-caption-12 uppercase tracking-[0.18em] text-grey-60">Recent activity</div>
          <div className="mt-4 space-y-3">
            {activity.map((item) => (
              <div key={`${item.transactionHash}-${item.timestamp}`} className="rounded-md border border-white/10 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-caption-13 font-semibold text-grey-90">{item.side || item.type}</div>
                  <div className="text-caption-12 text-grey-60">{formatCurrency(item.usdcSize)}</div>
                </div>
                <div className="mt-2 text-caption-12 text-grey-60 line-clamp-2">{item.title || item.slug || item.conditionId}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default PrediktsPortfolioPanel
