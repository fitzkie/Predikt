'use client'

import { type PolymarketMarket, parsePolymarketOutcomePrices, parsePolymarketOutcomes, parsePolymarketTokenIds, usePolymarketOrderBook, usePolymarketOrderBookStream } from 'providers/polymarket'
import { Href } from 'components/navigation'


type Props = {
  market: PolymarketMarket
  compact?: boolean
}

const formatPercent = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--'
  }

  return `${Math.round(value * 100)}%`
}

const formatVolume = (value?: string | number | null) => {
  const numericValue = typeof value === 'number' ? value : Number(value || 0)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return '$0 Vol.'
  }

  if (numericValue >= 1_000_000) {
    return `$${Math.round(numericValue / 100_000) / 10}m Vol.`
  }

  if (numericValue >= 1_000) {
    return `$${Math.round(numericValue / 100) / 10}k Vol.`
  }

  return `$${Math.round(numericValue)} Vol.`
}

const marketImage = (market: PolymarketMarket) => {
  return market.image || market.icon || market.events?.[0]?.image || market.events?.[0]?.icon || ''
}

const PrediktsMarketCard: React.FC<Props> = ({ market, compact = false }) => {
  const tokenIds = parsePolymarketTokenIds(market)
  const outcomes = parsePolymarketOutcomes(market)
  const outcomePrices = parsePolymarketOutcomePrices(market)
  const orderBookQuery = usePolymarketOrderBook(tokenIds[0])
  const image = marketImage(market)

  usePolymarketOrderBookStream(market)

  const yesPrice = outcomePrices[0]
  const noPrice = typeof yesPrice === 'number' ? Math.max(0, 1 - yesPrice) : undefined
  const secondOutcome = outcomes[1] || 'No'
  const marketVolume = market.volume24hr || market.volume
  const secondaryLines = outcomes.slice(0, compact ? 2 : 3)

  return (
    <Href
      to={`/predikts/${market.slug}`}
      className="block rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] p-4 transition hover:border-white/20 hover:bg-bg-l2"
    >
      <div className="flex items-start gap-3">
        {
          image ? (
            <img alt="" className="mt-0.5 size-12 rounded-xl object-cover" src={image} />
          ) : (
            <div className="mt-0.5 flex size-12 items-center justify-center rounded-xl bg-brand-50/15 text-caption-13 font-semibold uppercase tracking-[0.14em] text-brand-50">
              {(market.category || 'P').slice(0, 2)}
            </div>
          )
        }
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-heading-h5 font-semibold leading-7 text-grey-90">
            {market.question}
          </div>
          <div className="mt-2 text-caption-12 text-grey-60">
            {market.category || market.events?.[0]?.category || 'Predikt'}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {
          secondaryLines.length ? secondaryLines.map((outcome, index) => (
            <div key={`${market.id}-${outcome}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 text-caption-13">
              <div className="truncate text-grey-70">{outcome}</div>
              <div className="font-semibold text-grey-90">{formatPercent(outcomePrices[index])}</div>
              {
                index === 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#1f4e2d] px-3 py-1 text-caption-13 font-semibold text-[#7ef0a4]">Yes</span>
                    <span className="rounded-full bg-[#4e1f27] px-3 py-1 text-caption-13 font-semibold text-[#ff6c79]">No</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#1f4e2d] px-3 py-1 text-caption-13 font-semibold text-[#7ef0a4]">{formatPercent(outcomePrices[index])}</span>
                    <span className="rounded-full bg-[#4e1f27] px-3 py-1 text-caption-13 font-semibold text-[#ff6c79]">
                      {formatPercent(typeof outcomePrices[index] === 'number' ? 1 - outcomePrices[index] : undefined)}
                    </span>
                  </div>
                )
              }
            </div>
          )) : (
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 text-caption-13">
              <div className="truncate text-grey-70">{outcomes[0] || 'Yes'}</div>
              <div className="font-semibold text-grey-90">{formatPercent(yesPrice)}</div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#1f4e2d] px-3 py-1 text-caption-13 font-semibold text-[#7ef0a4]">Yes</span>
                <span className="rounded-full bg-[#4e1f27] px-3 py-1 text-caption-13 font-semibold text-[#ff6c79]">{secondOutcome}</span>
              </div>
            </div>
          )
        }

        {
          outcomes.length > secondaryLines.length && (
            <div className="text-caption-13 text-grey-60">
              +{outcomes.length - secondaryLines.length} more outcomes
            </div>
          )
        }
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4 text-caption-13 text-grey-60">
        <span>{formatVolume(marketVolume)}</span>
        <div className="flex items-center gap-3">
          <span>Yes {formatPercent(yesPrice)}</span>
          <span>No {formatPercent(noPrice)}</span>
          <span>{orderBookQuery.data?.last_trade_price ? `Last ${orderBookQuery.data.last_trade_price}` : ''}</span>
        </div>
      </div>
    </Href>
  )
}

export default PrediktsMarketCard
