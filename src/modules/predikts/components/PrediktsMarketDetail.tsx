'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { parsePolymarketOutcomePrices, parsePolymarketOutcomes, parsePolymarketTokenIds, type PolymarketEvent, type PolymarketMarket, usePolymarketActivity, usePolymarketEventBySlug, usePolymarketMarketBySlug, usePolymarketOpenOrders, usePolymarketOrderBook, usePolymarketOrderBookStream } from 'providers/polymarket'
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

const formatDate = (value?: string) => {
  if (!value) {
    return 'Open'
  }

  return new Date(value).toLocaleDateString()
}

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) {
    return 'Unknown'
  }

  return new Date(timestamp).toLocaleString()
}

const truncateBody = (value?: string, maxLength = 340) => {
  if (!value) {
    return ''
  }

  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength).trim()}...`
}

const marketVolume = (market: PolymarketMarket) => {
  return Number(market.volume24hr || market.volume || 0)
}

const sortMarkets = (markets: PolymarketMarket[]) => {
  return [ ...markets ]
    .filter((market) => market.active && !market.closed)
    .sort((left, right) => marketVolume(right) - marketVolume(left))
}

const yesPrice = (market: PolymarketMarket) => {
  const prices = parsePolymarketOutcomePrices(market)
  return typeof prices[0] === 'number' ? prices[0] : 0
}

const eventImage = (event?: PolymarketEvent | null, market?: PolymarketMarket | null) => {
  return event?.image || event?.icon || market?.image || market?.icon || market?.events?.[0]?.image || market?.events?.[0]?.icon || ''
}

const getResolutionRules = (event?: PolymarketEvent | null, market?: PolymarketMarket | null): string => {
  const extra = event as Record<string, unknown> | null
  const mExtra = market as Record<string, unknown> | null
  const source = String(extra?.resolutionSource || mExtra?.resolutionSource || '')
  const rules = String(extra?.rules || mExtra?.rules || '')
  const description = String(market?.description || event?.description || '')

  return rules || description || source || ''
}

const OrderBookPanel: React.FC<{ market: PolymarketMarket }> = ({ market }) => {
  const tokenIds = parsePolymarketTokenIds(market)
  const orderBookQuery = usePolymarketOrderBook(tokenIds[0])

  usePolymarketOrderBookStream(market)

  const bids = orderBookQuery.data?.bids.slice(0, 6) || []
  const asks = orderBookQuery.data?.asks.slice(0, 6) || []

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-caption-12 uppercase tracking-[0.14em] text-grey-60">Live Order Book</div>
        {orderBookQuery.data?.last_trade_price && (
          <div className="text-caption-12 text-grey-60">Last {orderBookQuery.data.last_trade_price}</div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-caption-11 uppercase tracking-[0.14em] text-grey-60">Bids</div>
          <div className="space-y-1.5">
            {bids.length ? bids.map((bid, index) => (
              <div key={`${bid.price}-${index}`} className="flex items-center justify-between rounded-lg bg-[#0f1810] px-3 py-1.5 text-caption-12">
                <span className="text-[#7ef0a5]">{bid.price}</span>
                <span className="text-grey-60">{bid.size}</span>
              </div>
            )) : <div className="text-caption-13 text-grey-60">No bids.</div>}
          </div>
        </div>
        <div>
          <div className="mb-2 text-caption-11 uppercase tracking-[0.14em] text-grey-60">Asks</div>
          <div className="space-y-1.5">
            {asks.length ? asks.map((ask, index) => (
              <div key={`${ask.price}-${index}`} className="flex items-center justify-between rounded-lg bg-[#1a0f10] px-3 py-1.5 text-caption-12">
                <span className="text-[#ff6f7c]">{ask.price}</span>
                <span className="text-grey-60">{ask.size}</span>
              </div>
            )) : <div className="text-caption-13 text-grey-60">No asks.</div>}
          </div>
        </div>
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

  if (!account) {
    return null
  }

  const hasOpenOrders = Boolean(openOrdersQuery.data?.length)
  const hasFills = fills.length > 0

  if (!openOrdersQuery.isLoading && !activityQuery.isLoading && !hasOpenOrders && !hasFills) {
    return null
  }

  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-[#161616] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-caption-12 uppercase tracking-[0.18em] text-grey-60">Orders and fills</div>
          <div className="mt-2 text-caption-13 text-grey-70">Open orders and recent fills for the selected contract.</div>
        </div>
        <button
          className="rounded-full border border-white/10 bg-[#0f0f10] px-3 py-2 text-caption-12 font-semibold text-grey-60 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={openOrdersQuery.isFetching || activityQuery.isFetching || !account}
          onClick={() => {
            void Promise.all([ openOrdersQuery.refetch(), activityQuery.refetch() ])
          }}
          type="button"
        >
          {openOrdersQuery.isFetching || activityQuery.isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="mt-5 grid gap-4 ds:grid-cols-2">
        <div>
          <div className="mb-3 text-caption-12 uppercase tracking-[0.14em] text-grey-60">Open orders</div>
          <div className="space-y-2">
            {openOrdersQuery.data?.length ? openOrdersQuery.data.map((order) => (
              <div key={order.id} className="rounded-xl bg-[#0f0f10] px-3 py-3 text-caption-13">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-grey-90">{order.side} {order.outcome}</span>
                  <span className="text-grey-60">{order.status}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-caption-12 text-grey-60">
                  <span>@ {order.price}</span>
                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            )) : (
              <div className="text-caption-13 text-grey-60">No open orders for this contract.</div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 text-caption-12 uppercase tracking-[0.14em] text-grey-60">Recent fills</div>
          <div className="space-y-2">
            {fills.length ? fills.map((fill) => (
              <div key={`${fill.transactionHash}-${fill.timestamp}`} className="rounded-xl bg-[#0f0f10] px-3 py-3 text-caption-13">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-grey-90">{fill.side || fill.type} {fill.outcome || ''}</span>
                  <span className="text-grey-60">{formatVolume(fill.usdcSize)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-caption-12 text-grey-60">
                  <span>{typeof fill.price === 'number' ? `@ ${fill.price}` : fill.type}</span>
                  <span>{formatTimestamp(fill.timestamp)}</span>
                </div>
              </div>
            )) : (
              <div className="text-caption-13 text-grey-60">No recent fills for this contract.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const PrediktsMarketDetail: React.FC<Props> = ({ slug }) => {
  const searchParams = useSearchParams()
  const directEventQuery = usePolymarketEventBySlug(slug)
  const directMarketQuery = usePolymarketMarketBySlug(slug)
  const relatedEventSlug = directMarketQuery.data?.events?.[0]?.slug
  const relatedEventQuery = usePolymarketEventBySlug(relatedEventSlug)
  const [ selectedMarketSlug, setSelectedMarketSlug ] = useState(searchParams.get('market') || slug)
  const [ selectedOutcomeIndex, setSelectedOutcomeIndex ] = useState(Number(searchParams.get('outcome') || '0'))
  const [ expandedMarketId, setExpandedMarketId ] = useState<string | null>(null)

  const selectOutcome = (marketSlug: string, outcomeIndex: number) => {
    setSelectedMarketSlug(marketSlug)
    setSelectedOutcomeIndex(outcomeIndex)
  }

  const toggleExpanded = (marketId: string) => {
    setExpandedMarketId((prev) => (prev === marketId ? null : marketId))
  }

  const event = directEventQuery.data || relatedEventQuery.data || null
  const directMarket = directMarketQuery.data || null
  const eventMarkets = useMemo(() => {
    if (event?.markets?.length) {
      return sortMarkets(event.markets)
    }

    return directMarket ? [ directMarket ] : []
  }, [ event, directMarket ])

  useEffect(() => {
    if (!selectedMarketSlug && eventMarkets[0]?.slug) {
      setSelectedMarketSlug(eventMarkets[0].slug)
    }
  }, [ eventMarkets, selectedMarketSlug ])

  useEffect(() => {
    const marketFromQuery = searchParams.get('market')
    const outcomeFromQuery = Number(searchParams.get('outcome') || '0')

    if (marketFromQuery) {
      setSelectedMarketSlug(marketFromQuery)
    }

    if (Number.isFinite(outcomeFromQuery)) {
      setSelectedOutcomeIndex(outcomeFromQuery)
    }
  }, [ searchParams ])

  const selectedMarket = eventMarkets.find((market) => market.slug === selectedMarketSlug) || eventMarkets[0] || directMarket

  if (directEventQuery.isLoading || directMarketQuery.isLoading || (relatedEventSlug && relatedEventQuery.isLoading)) {
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

  if (!selectedMarket) {
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

  const image = eventImage(event, selectedMarket)
  const totalVolume = eventMarkets.reduce((acc, market) => acc + marketVolume(market), 0)
  const marketContext = event?.description || selectedMarket.description || ''
  const rules = getResolutionRules(event, selectedMarket) || marketContext

  return (
    <div className="px-2 py-6 ds:px-4">
      <section className="flex flex-col gap-5 ds:flex-row ds:items-start">

        {/* LEFT: header + market list + context + rules */}
        <div className="min-w-0 flex-1 space-y-5">

          {/* Event header */}
          <div className="rounded-[1.5rem] border border-white/10 bg-[#151515] p-5 ds:p-6">
            <Href to="/predikts" className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">Back to Predikt</Href>
            <div className="mt-4 flex items-start gap-4">
              {
                image ? (
                  <img alt="" className="w-16 h-16 flex-none rounded-2xl object-cover" src={image} />
                ) : (
                  <div className="flex w-16 h-16 flex-none items-center justify-center rounded-2xl bg-brand-50/15 text-heading-h3 font-semibold text-brand-50">
                    {(event?.category || selectedMarket.category || 'P').slice(0, 2)}
                  </div>
                )
              }
              <div className="min-w-0 flex-1">
                <h1 className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.05em] text-grey-90 ds:text-[2.8rem]">
                  {event?.title || selectedMarket.question}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-caption-13 text-grey-60">
                  <span className="rounded-full border border-[#6d3da0] bg-[#6d3da0]/20 px-3 py-1 text-[#d7b8ff]">
                    {event?.category || selectedMarket.category || 'Predikt'}
                  </span>
                  <span>{formatVolume(totalVolume)} Vol.</span>
                  <span>{formatDate(event?.endDate || selectedMarket.endDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Market list */}
          <div className="rounded-[1.5rem] border border-white/10 bg-[#151515] overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_5rem_18rem] gap-3 border-b border-white/10 bg-[#101010] px-5 py-3 text-caption-12 uppercase tracking-[0.16em] text-grey-60">
              <div>Question</div>
              <div className="text-center">% Chance</div>
              <div />
            </div>
            <div>
              {
                eventMarkets.map((market) => {
                  const isSelected = market.slug === selectedMarket.slug
                  const isExpanded = expandedMarketId === market.id
                  const probability = yesPrice(market)

                  return (
                    <div key={market.id} className={`border-b border-white/10 last:border-b-0 ${isSelected ? 'bg-white/5' : 'bg-[#151515]'}`}>
                      <div className="grid grid-cols-[minmax(0,1fr)_5rem_18rem] gap-3 px-5 py-3 transition hover:bg-white/[0.03]">
                        <button
                          className="min-w-0 text-left"
                          onClick={() => toggleExpanded(market.id)}
                          type="button"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="line-clamp-2 text-[0.95rem] leading-[1.4] text-grey-90">{market.question}</div>
                              <div className="mt-0.5 text-caption-12 text-grey-60">{formatVolume(marketVolume(market))} Vol.</div>
                            </div>
                            <span className="shrink-0 text-[0.7rem] text-grey-50">{isExpanded ? '▴' : '▾'}</span>
                          </div>
                        </button>
                        <div className="flex items-center justify-center self-center text-[1.1rem] font-semibold text-grey-90">
                          {formatPercent(probability)}
                        </div>
                        <div className="flex items-center justify-end gap-2 self-center">
                          <button
                            className="rounded-[0.75rem] px-3 py-2 text-[0.88rem] font-semibold transition hover:brightness-110"
                            onClick={() => selectOutcome(market.slug, 0)}
                            style={{ backgroundColor: '#234f31', color: '#7ef0a5' }}
                            type="button"
                          >
                            Buy Yes {Math.round(probability * 1000) / 10}¢
                          </button>
                          <button
                            className="rounded-[0.75rem] px-3 py-2 text-[0.88rem] font-semibold transition hover:brightness-110"
                            onClick={() => selectOutcome(market.slug, 1)}
                            style={{ backgroundColor: '#4c2229', color: '#ff6f7c' }}
                            type="button"
                          >
                            Buy No {Math.round((1 - probability) * 1000) / 10}¢
                          </button>
                        </div>
                      </div>

                      {
                        isExpanded ? (
                          <div className="border-t border-white/10 bg-[#121212] px-5 pb-5">
                            <OrderBookPanel market={market} />
                          </div>
                        ) : null
                      }
                    </div>
                  )
                })
              }
            </div>
          </div>

          {/* Resolution Rules (combines market context + resolution criteria) */}
          {(marketContext || rules) ? (
            <div className="rounded-[1.5rem] border border-white/10 bg-[#151515] p-5 ds:p-6">
              <div className="text-[1.3rem] font-semibold tracking-[-0.03em] text-grey-90">Resolution Rules</div>
              <p className="mt-4 text-[1rem] leading-7 text-grey-70 whitespace-pre-line">
                {truncateBody(rules || marketContext, 800)}
              </p>
            </div>
          ) : null}

          {/* Orders and fills */}
          <MarketExecutionPanel market={selectedMarket} />
        </div>

        {/* RIGHT: trading panel — sticky on desktop */}
        <aside className="w-full shrink-0 space-y-4 ds:sticky ds:top-6 ds:w-[22rem] ds:self-start">
          <PrediktsTradingPanel
            initialOutcomeIndex={selectedOutcomeIndex}
            market={selectedMarket}
            onOutcomeChange={setSelectedOutcomeIndex}
          />
        </aside>
      </section>
    </div>
  )
}

export default PrediktsMarketDetail
