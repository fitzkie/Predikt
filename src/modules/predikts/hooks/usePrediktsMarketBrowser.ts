'use client'

import { useMemo } from 'react'
import { constants } from 'helpers'
import { usePolymarketMarkets, usePolymarketSearchMarkets, type PolymarketMarket } from 'providers/polymarket'


const normalize = (value?: string | null) => {
  return (value || '').toLowerCase()
}

const buildHaystack = (market: PolymarketMarket) => {
  return [
    normalize(market.question),
    normalize(market.slug),
    normalize(market.category),
    normalize(market.description),
    ...(market.events || []).flatMap((event) => [
      normalize(event.title),
      normalize(event.slug),
      normalize(event.category),
      normalize(event.description),
    ]),
  ].join(' ')
}

const dedupeMarkets = (markets: PolymarketMarket[]) => {
  const seen = new Set<string>()

  return markets.filter((market) => {
    if (!market?.id || seen.has(market.id)) {
      return false
    }

    seen.add(market.id)
    return true
  })
}

const isMarketActive = (market: PolymarketMarket) => {
  return Boolean(market.active && !market.closed && !market.restricted)
}

const toNumericValue = (value?: string | number | null) => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value)

    return Number.isFinite(parsedValue) ? parsedValue : 0
  }

  return 0
}

const boardSections = [
  { key: 'trending', label: 'Trending' },
  { key: 'new', label: 'New' },
  ...constants.prediktsTaxonomy.map((category) => ({
    key: category.slug,
    label: category.title,
  })),
] as const

const usePrediktsMarketBrowser = () => {
  const trendingQuery = usePolymarketMarkets({
    active: true,
    closed: false,
    limit: 300,
    order: 'volume24hr',
    ascending: false,
  })
  const newestQuery = usePolymarketMarkets({
    active: true,
    closed: false,
    limit: 160,
    order: 'createdAt',
    ascending: false,
  })
  const politicsQuery = usePolymarketSearchMarkets('politics', 120)
  const financeQuery = usePolymarketSearchMarkets('finance', 120)
  const sportsQuery = usePolymarketSearchMarkets('sports', 120)
  const techQuery = usePolymarketSearchMarkets('tech', 120)
  const cultureQuery = usePolymarketSearchMarkets('culture', 120)
  const blackSwanQuery = usePolymarketSearchMarkets('geopolitics war weather pandemic space', 120)

  const laneResults = {
    politics: politicsQuery.data || [],
    finance: financeQuery.data || [],
    sports: sportsQuery.data || [],
    tech: techQuery.data || [],
    culture: cultureQuery.data || [],
    'black-swan': blackSwanQuery.data || [],
  } as const

  const data = useMemo(() => {
    const trendingMarkets = dedupeMarkets((trendingQuery.data || []).filter(isMarketActive))
    const newestMarkets = dedupeMarkets((newestQuery.data || []).filter(isMarketActive))

    const lanes = constants.prediktsTaxonomy.map((category) => {
      const searchTerms = [ category.title, ...category.items ].map(normalize)
      const fromSearch = (laneResults[category.slug as keyof typeof laneResults] || []).filter(isMarketActive)
      const fromTrending = trendingMarkets.filter((market) => {
        const haystack = buildHaystack(market)

        return searchTerms.some((term) => haystack.includes(term))
      })

      const markets = dedupeMarkets([ ...fromSearch, ...fromTrending ])

      return {
        ...category,
        markets,
        count: markets.length,
      }
    })

    const marketBySection: Record<string, PolymarketMarket[]> = {
      trending: trendingMarkets,
      new: newestMarkets,
    }

    lanes.forEach((lane) => {
      marketBySection[lane.slug] = lane.markets
    })

    const tagChipPool = dedupeMarkets([ ...trendingMarkets, ...newestMarkets ]).slice(0, 100)
    const tags = Array.from(new Set(tagChipPool.flatMap((market) => [ market.category, ...(market.events || []).map((event) => event.category) ]).filter(Boolean))).slice(0, 18) as string[]

    const featuredMarkets = trendingMarkets.slice(0, 12)

    return {
      featuredMarkets,
      lanes,
      marketBySection,
      sections: boardSections,
      tags,
      totalLiveMarkets: trendingMarkets.length,
      trendingMarkets,
    }
  }, [ trendingQuery.data, newestQuery.data, politicsQuery.data, financeQuery.data, sportsQuery.data, techQuery.data, cultureQuery.data, blackSwanQuery.data ])

  const isLoading = [
    trendingQuery.isLoading,
    newestQuery.isLoading,
    politicsQuery.isLoading,
    financeQuery.isLoading,
    sportsQuery.isLoading,
    techQuery.isLoading,
    cultureQuery.isLoading,
    blackSwanQuery.isLoading,
  ].some(Boolean)

  const isFetching = [
    trendingQuery.isFetching,
    newestQuery.isFetching,
    politicsQuery.isFetching,
    financeQuery.isFetching,
    sportsQuery.isFetching,
    techQuery.isFetching,
    cultureQuery.isFetching,
    blackSwanQuery.isFetching,
  ].some(Boolean)

  const totals = useMemo(() => {
    return Object.fromEntries(Object.entries(data.marketBySection).map(([ key, markets ]) => ([
      key,
      markets.reduce((acc, market) => acc + toNumericValue(market.volume24hr || market.volume), 0),
    ])))
  }, [ data.marketBySection ])

  return {
    ...data,
    totals,
    isFetching,
    isLoading,
  } as const
}

export default usePrediktsMarketBrowser
