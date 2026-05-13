'use client'

import { type PolymarketMarket, parsePolymarketOutcomePrices, parsePolymarketOutcomes, parsePolymarketTokenIds, usePolymarketOrderBook, usePolymarketOrderBookStream } from 'providers/polymarket'
import { Href } from 'components/navigation'


type Props = {
  market: PolymarketMarket
  compact?: boolean
}

const formatPercent = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'N/A'
  }

  return `${Math.round(value * 100)}%`
}

const PrediktsMarketCard: React.FC<Props> = ({ market, compact = false }) => {
  const tokenIds = parsePolymarketTokenIds(market)
  const outcomes = parsePolymarketOutcomes(market)
  const outcomePrices = parsePolymarketOutcomePrices(market)
  const orderBookQuery = usePolymarketOrderBook(tokenIds[0])

  usePolymarketOrderBookStream(market)

  const yesPrice = outcomePrices[0]
  const bestBid = orderBookQuery.data?.bids[0]?.price
  const bestAsk = orderBookQuery.data?.asks[0]?.price
  const subtitle = compact ? market.category : market.description

  return (
    <Href to={`/predikts/${market.slug}`} className="block rounded-lg border border-white/10 bg-bg-l3 p-4 transition hover:border-brand-50/40 hover:bg-bg-l2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-caption-12 uppercase tracking-[0.16em] text-brand-50">{market.category || 'Predikt'}</span>
        <span className="text-heading-h5 font-semibold text-grey-90">{formatPercent(yesPrice)}</span>
      </div>
      <div className="mt-3 text-caption-14 font-semibold leading-6 text-grey-90">
        {market.question}
      </div>
      {
        subtitle ? (
          <p className="mt-3 text-caption-13 leading-6 text-grey-70 line-clamp-3">
            {subtitle}
          </p>
        ) : null
      }
      <div className="mt-4 grid grid-cols-2 gap-2 text-caption-12 text-grey-60">
        <div className="rounded-md border border-white/10 px-3 py-2">
          <div className="uppercase tracking-[0.14em]">Best Bid</div>
          <div className="mt-1 text-caption-13 font-semibold text-grey-90">{bestBid || '...'}</div>
        </div>
        <div className="rounded-md border border-white/10 px-3 py-2">
          <div className="uppercase tracking-[0.14em]">Best Ask</div>
          <div className="mt-1 text-caption-13 font-semibold text-grey-90">{bestAsk || '...'}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {outcomes.slice(0, 2).map((outcome, index) => (
          <span key={`${market.id}-${outcome}`} className="rounded-full border border-white/10 px-2 py-1 text-caption-12 text-grey-60">
            {outcome}: {formatPercent(outcomePrices[index])}
          </span>
        ))}
      </div>
    </Href>
  )
}

export default PrediktsMarketCard
