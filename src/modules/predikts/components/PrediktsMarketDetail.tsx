'use client'

import { parsePolymarketOutcomePrices, parsePolymarketOutcomes, parsePolymarketTokenIds, usePolymarketActivity, usePolymarketMarketBySlug, usePolymarketOpenOrders, usePolymarketOrderBook, usePolymarketOrderBookStream, type PolymarketMarket } from 'providers/polymarket'
import { useWallet } from 'wallet'

import { Href } from 'components/navigation'

import PrediktsTradingPanel from './PrediktsTradingPanel'


type Props = {
  slug: string
}

const formatPercent = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'N/A'
  }

  return `${Math.round(value * 100)}%`
}

const formatCurrency = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '$0'
  }

  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

const formatVolume = (value?: string | number) => {
  const numericValue = typeof value === 'number' ? value : Number(value || 0)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return '$0'
  }

  if (numericValue >= 1_000_000) {
    return `$${Math.round(numericValue / 100_000) / 10}m`
  }

  if (numericValue >= 1_000) {
    return `$${Math.round(numericValue / 100) / 10}k`
  }

  return `$${Math.round(numericValue)}`
}

const marketImage = (market: PolymarketMarket) => {
  return market.image || market.icon || market.events?.[0]?.image || market.events?.[0]?.icon || ''
}

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) {
    return 'Unknown'
  }

  return new Date(timestamp).toLocaleString()
}

const OrderBookPanel: React.FC<{ market: PolymarketMarket }> = ({ market }) => {
  const tokenIds = parsePolymarketTokenIds(market)
  const orderBookQuery = usePolymarketOrderBook(tokenIds[0])

  usePolymarketOrderBookStream(market)

  const bids = orderBookQuery.data?.bids.slice(0, 5) || []
  const asks = orderBookQuery.data?.asks.slice(0, 5) || []

  return (
    <div className="rounded-xl border border-white/10 bg-bg-l2 p-5">
      <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">Live Order Book</div>
      <div className="mt-4 grid gap-4 ds:grid-cols-2">
        <div>
          <div className="text-caption-12 uppercase tracking-[0.14em] text-grey-60">Bids</div>
          <div className="mt-3 space-y-2">
            {bids.length ? bids.map((bid, index) => (
              <div key={`${bid.price}-${index}`} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-caption-13">
                <span className="text-grey-90">{bid.price}</span>
                <span className="text-grey-60">{bid.size}</span>
              </div>
            )) : <div className="text-caption-13 text-grey-60">No bid depth loaded.</div>}
          </div>
        </div>
        <div>
          <div className="text-caption-12 uppercase tracking-[0.14em] text-grey-60">Asks</div>
          <div className="mt-3 space-y-2">
            {asks.length ? asks.map((ask, index) => (
              <div key={`${ask.price}-${index}`} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-caption-13">
                <span className="text-grey-90">{ask.price}</span>
                <span className="text-grey-60">{ask.size}</span>
              </div>
            )) : <div className="text-caption-13 text-grey-60">No ask depth loaded.</div>}
          </div>
        </div>
      </div>
      <div className="mt-4 text-caption-12 text-grey-60">
        Last trade: {orderBookQuery.data?.last_trade_price || '...'}
      </div>
    </div>
  )
}

const MarketExecutionPanel: React.FC<{ market: PolymarketMarket }> = ({ market }) => {
  const { account } = useWallet()
  const tokenIds = parsePolymarketTokenIds(market)
  const openOrdersQuery = usePolymarketOpenOrders(tokenIds)
  const activityQuery = usePolymarketActivity(account)
  const fills = (activityQuery.data || [])
    .filter((item) => item.slug === market.slug || (item.asset && tokenIds.includes(item.asset)))
    .slice(0, 6)

  return (
    <div className="rounded-xl border border-white/10 bg-bg-l2 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">Orders and fills</div>
          <div className="mt-2 text-caption-13 text-grey-70">
            Your open orders and recent fills for this market.
          </div>
        </div>
        <button
          className="rounded-md border border-white/10 px-3 py-2 text-caption-12 font-semibold text-grey-60 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={openOrdersQuery.isFetching || activityQuery.isFetching || !account}
          onClick={() => {
            void Promise.all([ openOrdersQuery.refetch(), activityQuery.refetch() ])
          }}
        >
          {openOrdersQuery.isFetching || activityQuery.isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="mt-5 grid gap-4 ds:grid-cols-2">
        <div>
          <div className="text-caption-12 uppercase tracking-[0.14em] text-grey-60">Open orders</div>
          <div className="mt-3 space-y-2">
            {!account ? (
              <div className="text-caption-13 text-grey-60">Connect a wallet to load open orders.</div>
            ) : openOrdersQuery.data?.length ? openOrdersQuery.data.map((order) => {
              const remainingSize = Math.max(Number(order.original_size) - Number(order.size_matched), 0)

              return (
                <div key={order.id} className="rounded-md border border-white/10 px-3 py-3 text-caption-13">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-grey-90">{order.side} {order.outcome}</span>
                    <span className="text-grey-60">{order.status}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-caption-12 text-grey-60">
                    <span>@ {order.price}</span>
                    <span>Remaining {remainingSize.toFixed(2)}</span>
                  </div>
                </div>
              )
            }) : (
              <div className="text-caption-13 text-grey-60">No open orders loaded for this market.</div>
            )}
          </div>
        </div>

        <div>
          <div className="text-caption-12 uppercase tracking-[0.14em] text-grey-60">Recent fills</div>
          <div className="mt-3 space-y-2">
            {!account ? (
              <div className="text-caption-13 text-grey-60">Connect a wallet to load fills and activity.</div>
            ) : fills.length ? fills.map((fill) => (
              <div key={`${fill.transactionHash}-${fill.timestamp}`} className="rounded-md border border-white/10 px-3 py-3 text-caption-13">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-grey-90">{fill.side || fill.type} {fill.outcome || ''}</span>
                  <span className="text-grey-60">{formatCurrency(fill.usdcSize)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-caption-12 text-grey-60">
                  <span>{typeof fill.price === 'number' ? `@ ${fill.price}` : fill.type}</span>
                  <span>{formatTimestamp(fill.timestamp)}</span>
                </div>
              </div>
            )) : (
              <div className="text-caption-13 text-grey-60">No recent fills found for this market.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const PrediktsMarketDetail: React.FC<Props> = ({ slug }) => {
  const marketQuery = usePolymarketMarketBySlug(slug)

  if (marketQuery.isLoading) {
    return (
      <div className="px-2 py-6 ds:px-4">
        <div className="rounded-xl border border-white/10 bg-bg-l2 p-6">
          <div className="bone h-4 w-28 rounded-full" />
          <div className="mt-4 bone h-16 w-full rounded-lg" />
          <div className="mt-4 bone h-32 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  const market = marketQuery.data

  if (!market) {
    return (
      <div className="px-2 py-6 ds:px-4">
        <div className="rounded-xl border border-white/10 bg-bg-l2 p-6">
          <div className="text-heading-h4 font-semibold text-grey-90">Market not found</div>
          <p className="mt-3 text-caption-14 leading-6 text-grey-70">
            This market link did not return a live market.
          </p>
          <Href to="/predikts" className="mt-5 inline-flex text-caption-13 font-semibold text-brand-50">Back to Predikt</Href>
        </div>
      </div>
    )
  }

  const outcomes = parsePolymarketOutcomes(market)
  const prices = parsePolymarketOutcomePrices(market)
  const image = marketImage(market)

  return (
    <div className="px-2 py-6 ds:px-4">
      <section className="grid gap-4 ds:grid-cols-[minmax(0,1.55fr)_minmax(21rem,0.85fr)]">
        <div className="rounded-[1.5rem] border border-white/10 bg-[#161616] p-5 ds:p-6">
          <Href to="/predikts" className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">Back to Predikt</Href>
          <div className="mt-4 grid gap-5 ds:grid-cols-[minmax(0,1fr)_14rem]">
            <div>
              <div className="text-caption-12 uppercase tracking-[0.18em] text-grey-60">{market.category || market.events?.[0]?.category || 'Predikt'}</div>
              <h1 className="mt-3 text-[2rem] font-semibold leading-[1.02] tracking-[-0.05em] text-grey-90 ds:text-[3.1rem]">
                {market.question}
              </h1>
              <p className="mt-4 max-w-3xl text-caption-14 leading-7 text-grey-70 ds:text-base">
                {market.description || 'Live market pricing, real-time depth, and wallet-native execution for this contract.'}
              </p>
              <div className="mt-5 grid gap-3 ds:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-bg-l2 px-4 py-3">
                  <div className="text-caption-12 uppercase tracking-[0.14em] text-grey-60">24H Volume</div>
                  <div className="mt-2 text-heading-h4 font-semibold text-grey-90">{formatVolume(market.volume24hr || market.volume)}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-bg-l2 px-4 py-3">
                  <div className="text-caption-12 uppercase tracking-[0.14em] text-grey-60">Liquidity</div>
                  <div className="mt-2 text-heading-h4 font-semibold text-grey-90">{formatVolume(market.liquidity)}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-bg-l2 px-4 py-3">
                  <div className="text-caption-12 uppercase tracking-[0.14em] text-grey-60">Ends</div>
                  <div className="mt-2 text-caption-13 font-semibold text-grey-90">{market.endDate ? new Date(market.endDate).toLocaleDateString() : 'Open'}</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {
                image ? (
                  <img alt="" className="h-28 w-full rounded-2xl object-cover" src={image} />
                ) : (
                  <div className="flex h-28 w-full items-center justify-center rounded-2xl bg-brand-50/15 text-heading-h2 font-semibold text-brand-50">
                    {(market.category || 'P').slice(0, 2)}
                  </div>
                )
              }
              <div className="rounded-2xl border border-white/10 bg-bg-l2 p-3">
                <div className="text-caption-12 uppercase tracking-[0.14em] text-grey-60">Outcomes</div>
                <div className="mt-3 space-y-2">
                  {
                    outcomes.slice(0, 4).map((outcome, index) => (
                      <div key={`${market.id}-${outcome}`} className="flex items-center justify-between rounded-xl border border-white/8 bg-bg-l0 px-3 py-2">
                        <span className="truncate pr-3 text-caption-13 text-grey-70">{outcome}</span>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-[#193724] px-3 py-1 text-caption-13 font-semibold text-[#72f29c]">Yes {formatPercent(prices[index])}</span>
                          <span className="rounded-full bg-[#421a22] px-3 py-1 text-caption-13 font-semibold text-[#ff6a78]">No {formatPercent(typeof prices[index] === 'number' ? 1 - prices[index] : undefined)}</span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <PrediktsTradingPanel market={market} />
          <div className="rounded-xl border border-white/10 bg-bg-l2 p-5">
            <div className="text-caption-12 uppercase tracking-[0.18em] text-grey-60">Market metadata</div>
            <div className="mt-4 space-y-2 text-caption-13 text-grey-70">
              <div>Slug: {market.slug}</div>
              <div>Condition ID: {market.conditionId || 'N/A'}</div>
              <div>Volume: {formatVolume(market.volume)}</div>
              <div>Liquidity: {formatVolume(market.liquidity)}</div>
              <div>Ends: {market.endDate ? new Date(market.endDate).toLocaleString() : 'N/A'}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 ds:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <OrderBookPanel market={market} />
        <MarketExecutionPanel market={market} />
      </section>
    </div>
  )
}

export default PrediktsMarketDetail
