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

const noPrice = (market: PolymarketMarket) => {
  return Math.max(0, 1 - yesPrice(market))
}

const outcomeLabel = (market: PolymarketMarket) => {
  return parsePolymarketOutcomes(market)[0] || market.question
}

const eventImage = (event?: PolymarketEvent | null, market?: PolymarketMarket | null) => {
  return event?.image || event?.icon || market?.image || market?.icon || market?.events?.[0]?.image || market?.events?.[0]?.icon || ''
}

const OrderBookPanel: React.FC<{ market: PolymarketMarket }> = ({ market }) => {
  const tokenIds = parsePolymarketTokenIds(market)
  const orderBookQuery = usePolymarketOrderBook(tokenIds[0])

  usePolymarketOrderBookStream(market)

  const bids = orderBookQuery.data?.bids.slice(0, 6) || []
  const asks = orderBookQuery.data?.asks.slice(0, 6) || []

  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-[#161616] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-caption-12 uppercase tracking-[0.18em] text-grey-60">Live Order Book</div>
          <div className="mt-2 text-caption-13 text-grey-70">Current depth for the selected contract.</div>
        </div>
        <div className="text-caption-12 text-grey-60">Last {orderBookQuery.data?.last_trade_price || '--'}</div>
      </div>
      <div className="mt-4 grid gap-4 ds:grid-cols-2">
        <div>
          <div className="mb-3 text-caption-12 uppercase tracking-[0.14em] text-grey-60">Bids</div>
          <div className="space-y-2">
            {bids.length ? bids.map((bid, index) => (
              <div key={`${bid.price}-${index}`} className="flex items-center justify-between rounded-xl bg-[#0f0f10] px-3 py-2 text-caption-13">
                <span className="text-[#7ef0a5]">{bid.price}</span>
                <span className="text-grey-60">{bid.size}</span>
              </div>
            )) : <div className="text-caption-13 text-grey-60">No bid depth loaded.</div>}
          </div>
        </div>
        <div>
          <div className="mb-3 text-caption-12 uppercase tracking-[0.14em] text-grey-60">Asks</div>
          <div className="space-y-2">
            {asks.length ? asks.map((ask, index) => (
              <div key={`${ask.price}-${index}`} className="flex items-center justify-between rounded-xl bg-[#0f0f10] px-3 py-2 text-caption-13">
                <span className="text-[#ff6f7c]">{ask.price}</span>
                <span className="text-grey-60">{ask.size}</span>
              </div>
            )) : <div className="text-caption-13 text-grey-60">No ask depth loaded.</div>}
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
            {!account ? (
              <div className="text-caption-13 text-grey-60">Connect a wallet to load open orders.</div>
            ) : openOrdersQuery.data?.length ? openOrdersQuery.data.map((order) => (
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
            {!account ? (
              <div className="text-caption-13 text-grey-60">Connect a wallet to load fills.</div>
            ) : fills.length ? fills.map((fill) => (
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
  const [ detailTab, setDetailTab ] = useState<'order-book' | 'rules'>('order-book')

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
  const marketContext = event?.description || selectedMarket.description || 'Live market context and contract details for this event will appear here.'
  const rulesBody = String((event as Record<string, unknown> | null)?.resolutionSource || selectedMarket.description || event?.description || '')

  return (
    <div className="px-2 py-6 ds:px-4">
      <section className="grid gap-5 ds:grid-cols-[minmax(0,1.5fr)_minmax(22rem,0.85fr)]">
        <div className="space-y-5">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#151515] p-5 ds:p-6">
            <Href to="/predikts" className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">Back to Predikt</Href>
            <div className="mt-4 flex items-start gap-4">
              {
                image ? (
                  <img alt="" className="size-16 rounded-2xl object-cover" src={image} />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-50/15 text-heading-h3 font-semibold text-brand-50">
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

          <div className="rounded-[1.5rem] border border-white/10 bg-[#151515] overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-b border-white/10 bg-[#101010] px-5 py-4 text-caption-12 uppercase tracking-[0.16em] text-grey-60">
              <div>Question</div>
              <div>% Chance</div>
              <div />
            </div>
            <div>
              {
                eventMarkets.map((market) => {
                  const active = market.slug === selectedMarket.slug
                  const probability = yesPrice(market)

                  return (
                    <div key={market.id} className={`border-b border-white/10 last:border-b-0 ${active ? 'bg-white/5' : 'bg-[#151515]'}`}>
                      <div
                        className={`grid grid-cols-[minmax(0,1fr)_7rem_24rem] gap-4 px-5 py-5 transition ${active ? '' : 'hover:bg-white/2'}`}
                      >
                        <button
                          className="min-w-0 text-left"
                          onClick={() => {
                            setSelectedMarketSlug(market.slug)
                            setSelectedOutcomeIndex(0)
                          }}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[1.15rem] leading-8 text-grey-90">{market.question}</div>
                              <div className="mt-1 text-caption-13 text-grey-60">{formatVolume(marketVolume(market))} Vol.</div>
                            </div>
                            <span className="mt-1 text-grey-50">{active ? '▴' : '▾'}</span>
                          </div>
                        </button>
                        <div className="flex items-center justify-center text-[1.45rem] font-semibold text-grey-90">
                          {formatPercent(probability)}
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            className="min-w-[11rem] rounded-[1rem] px-5 py-3 text-[1rem] font-semibold transition hover:brightness-110"
                            onClick={() => {
                              setSelectedMarketSlug(market.slug)
                              setSelectedOutcomeIndex(0)
                            }}
                            style={{ backgroundColor: '#234f31', color: '#7ef0a5' }}
                            type="button"
                          >
                            Buy Yes {Math.round(probability * 1000) / 10}¢
                          </button>
                          <button
                            className="min-w-[11rem] rounded-[1rem] px-5 py-3 text-[1rem] font-semibold transition hover:brightness-110"
                            onClick={() => {
                              setSelectedMarketSlug(market.slug)
                              setSelectedOutcomeIndex(1)
                            }}
                            style={{ backgroundColor: '#4c2229', color: '#ff6f7c' }}
                            type="button"
                          >
                            Buy No {Math.round((1 - probability) * 1000) / 10}¢
                          </button>
                        </div>
                      </div>

                      {
                        active ? (
                          <div className="border-t border-white/10 bg-[#121212] px-5 py-4">
                            <div className="flex items-center gap-6 border-b border-white/10 pb-3">
                              <button
                                className={`pb-2 text-[1rem] font-semibold ${detailTab === 'order-book' ? 'border-b-2 border-brand-50 text-grey-90' : 'text-grey-50'}`}
                                onClick={() => setDetailTab('order-book')}
                                type="button"
                              >
                                Order Book
                              </button>
                              <button
                                className={`pb-2 text-[1rem] font-semibold ${detailTab === 'rules' ? 'border-b-2 border-brand-50 text-grey-90' : 'text-grey-50'}`}
                                onClick={() => setDetailTab('rules')}
                                type="button"
                              >
                                Rules
                              </button>
                            </div>
                            <div className="pt-4">
                              {
                                detailTab === 'order-book' ? (
                                  <OrderBookPanel market={market} />
                                ) : (
                                  <div className="rounded-[1.25rem] border border-white/10 bg-[#151515] p-5">
                                    <div className="text-[1.4rem] font-semibold tracking-[-0.02em] text-grey-90">Rules</div>
                                    <p className="mt-4 text-[1rem] leading-7 text-grey-70">
                                      {truncateBody(String((event as Record<string, unknown> | null)?.resolutionSource || market.description || event?.description || ''), 560)}
                                    </p>
                                  </div>
                                )
                              }
                            </div>
                          </div>
                        ) : null
                      }
                    </div>
                  )
                })
              }
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#151515] p-5 ds:p-6">
              <div className="text-[1.7rem] font-semibold tracking-[-0.03em] text-grey-90">Market Context</div>
              <p className="mt-5 max-w-4xl text-[1.1rem] leading-8 text-grey-70">
                {truncateBody(marketContext, 520)}
              </p>
            </div>

            <MarketExecutionPanel market={selectedMarket} />
          </div>
        </div>

        <div id="trade" className="space-y-4 ds:sticky ds:top-6 ds:self-start">
          <PrediktsTradingPanel
            initialOutcomeIndex={selectedOutcomeIndex}
            market={selectedMarket}
          />
        </div>
      </section>
    </div>
  )
}

export default PrediktsMarketDetail
