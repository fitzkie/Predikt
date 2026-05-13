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

  return (
    <div className="px-2 py-6 ds:px-4">
      <section className="rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(235,180,55,0.16),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 ds:p-8">
        <Href to="/predikts" className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">Back to Predikt</Href>
        <div className="mt-4 max-w-4xl">
          <div className="text-caption-12 uppercase tracking-[0.18em] text-grey-60">{market.category || 'Predikt'}</div>
          <h1 className="mt-3 text-[2.1rem] font-semibold leading-[0.98] tracking-[-0.05em] text-grey-90 ds:text-[3.75rem]">
            {market.question}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-grey-70 ds:text-lg">
            {market.description || 'This market is being pulled live and enriched with real-time order-book depth for Predikt.'}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {outcomes.map((outcome, index) => (
            <span key={`${market.id}-${outcome}`} className="rounded-full border border-white/10 px-3 py-1.5 text-caption-12 text-grey-60">
              {outcome}: {formatPercent(prices[index])}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-4 ds:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.85fr)]">
        <div className="space-y-4">
          <OrderBookPanel market={market} />
          <MarketExecutionPanel market={market} />
        </div>
        <div className="space-y-4">
          <PrediktsTradingPanel market={market} />
          <div className="rounded-xl border border-white/10 bg-bg-l2 p-5">
            <div className="text-caption-12 uppercase tracking-[0.18em] text-grey-60">Market metadata</div>
            <div className="mt-4 space-y-2 text-caption-13 text-grey-70">
              <div>Slug: {market.slug}</div>
              <div>Condition ID: {market.conditionId || 'N/A'}</div>
              <div>Volume: {market.volume || 'N/A'}</div>
              <div>Liquidity: {market.liquidity || 'N/A'}</div>
              <div>Ends: {market.endDate || 'N/A'}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PrediktsMarketDetail
