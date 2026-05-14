'use client'

import { useMemo } from 'react'
import { constants } from 'helpers'
import { usePolymarketMarkets, usePolymarketSearchMarkets, type PolymarketEvent, type PolymarketMarket } from 'providers/polymarket'


export type PrediktBoardEventRow = {
  market: PolymarketMarket
  outcomeLabel: string
  probability: number
  yesPrice: number
  noPrice: number
  volume: number
}

export type PrediktBoardEvent = {
  id: string
  slug: string
  title: string
  subtitle: string
  category: string
  image?: string
  event?: PolymarketEvent
  markets: PolymarketMarket[]
  rows: PrediktBoardEventRow[]
  totalMarkets: number
  volume: number
  endDate?: string
}

type SubcategoryBucket = {
  label: string
  slug: string
  count: number
  events: PrediktBoardEvent[]
}

const boardSections = [
  { key: 'all', label: 'All' },
  { key: 'trending', label: 'Trending' },
  { key: 'new', label: 'New' },
  ...constants.prediktsTaxonomy.map((category) => ({
    key: category.slug,
    label: category.title,
  })),
] as const

const normalize = (value?: string | null) => {
  return (value || '').toLowerCase()
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

const parseArrayField = <T extends string | number>(value?: string | null, predicate?: (item: unknown) => item is T) => {
  if (!value) {
    return []
  }

  try {
    const parsedValue = JSON.parse(value)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    if (!predicate) {
      return parsedValue as T[]
    }

    return parsedValue.filter(predicate)
  }
  catch {
    return []
  }
}

const parseOutcomePrices = (market: PolymarketMarket) => {
  return parseArrayField<number | string>(market.outcomePrices, (item): item is number | string => typeof item === 'number' || typeof item === 'string')
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
}

const parseOutcomes = (market: PolymarketMarket) => {
  return parseArrayField<string>(market.outcomes, (item): item is string => typeof item === 'string')
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
  return Boolean(market.active && !market.closed)
}

const sortMarketsByVolume = (markets: PolymarketMarket[]) => {
  return [ ...markets ].sort((left, right) => toNumericValue(right.volume24hr || right.volume) - toNumericValue(left.volume24hr || left.volume))
}

const groupMarketsIntoEvents = (markets: PolymarketMarket[]) => {
  const grouped = new Map<string, PolymarketMarket[]>()

  sortMarketsByVolume(markets).forEach((market) => {
    const event = market.events?.[0]
    const eventKey = event?.slug || event?.title || market.slug
    const current = grouped.get(eventKey) || []
    current.push(market)
    grouped.set(eventKey, current)
  })

  const events: PrediktBoardEvent[] = Array.from(grouped.entries()).map(([ eventKey, eventMarkets ]) => {
    const sortedMarkets = sortMarketsByVolume(eventMarkets)
    const representative = sortedMarkets[0]
    const event = representative.events?.[0]
    const rows: PrediktBoardEventRow[] = sortedMarkets.map((market) => {
      const outcomes = parseOutcomes(market)
      const prices = parseOutcomePrices(market)
      const yesPrice = typeof prices[0] === 'number' ? prices[0] : 0
      const noPrice = Math.max(0, 1 - yesPrice)

      return {
        market,
        outcomeLabel: outcomes[0] || market.question,
        probability: yesPrice,
        yesPrice,
        noPrice,
        volume: toNumericValue(market.volume24hr || market.volume),
      }
    })

    const totalVolume = rows.reduce((acc, row) => acc + row.volume, 0)

    return {
      id: event?.id || representative.id || eventKey,
      slug: event?.slug || representative.slug,
      title: event?.title || representative.question,
      subtitle: event?.category || representative.category || 'Predikt',
      category: event?.category || representative.category || 'Predikt',
      image: event?.image || event?.icon || representative.image || representative.icon,
      event,
      markets: sortedMarkets,
      rows,
      totalMarkets: sortedMarkets.length,
      volume: totalVolume,
      endDate: event?.endDate || representative.endDate,
    }
  })

  return events.sort((left, right) => right.volume - left.volume)
}

const usePrediktsMarketBrowser = () => {
  const trendingQuery = usePolymarketMarkets({
    active: true,
    closed: false,
    limit: 2000,
    order: 'volume24hr',
    ascending: false,
  })
  const newestQuery = usePolymarketMarkets({
    active: true,
    closed: false,
    limit: 1000,
    order: 'createdAt',
    ascending: false,
  })
  const politicsQuery = usePolymarketSearchMarkets('politics', 500)
  const financeQuery = usePolymarketSearchMarkets('finance', 500)
  const cryptoQuery = usePolymarketSearchMarkets('crypto bitcoin ethereum solana meme', 500)
  const geopoliticsQuery = usePolymarketSearchMarkets('geopolitics china war sanctions taiwan world leader', 500)
  const sportsQuery = usePolymarketSearchMarkets('sports', 500)
  const techQuery = usePolymarketSearchMarkets('tech', 500)
  const cultureQuery = usePolymarketSearchMarkets('culture', 500)
  const climateQuery = usePolymarketSearchMarkets('climate weather hurricane pandemic science space', 500)

  const laneResults = {
    politics: politicsQuery.data || [],
    finance: financeQuery.data || [],
    crypto: cryptoQuery.data || [],
    geopolitics: geopoliticsQuery.data || [],
    sports: sportsQuery.data || [],
    tech: techQuery.data || [],
    culture: cultureQuery.data || [],
    climate: climateQuery.data || [],
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
      const events = groupMarketsIntoEvents(markets)
      const subcategories: SubcategoryBucket[] = category.items.map((item) => {
        const itemTerm = normalize(item)
        const itemEvents = events.filter((event) => {
          return event.markets.some((market) => buildHaystack(market).includes(itemTerm))
        })

        return {
          label: item,
          slug: `${category.slug}:${itemTerm.replace(/\s+/g, '-')}`,
          count: itemEvents.length,
          events: itemEvents,
        }
      }).filter((bucket) => bucket.count > 0)

      return {
        ...category,
        markets,
        events,
        count: events.length,
        subcategories,
      }
    })

    const lanePool = lanes.flatMap((lane) => lane.markets)
    const allMarkets = dedupeMarkets([ ...trendingMarkets, ...newestMarkets, ...lanePool ])
    const allEvents = groupMarketsIntoEvents(allMarkets)
    const trendingEvents = groupMarketsIntoEvents(trendingMarkets)
    const newestEvents = groupMarketsIntoEvents(newestMarkets)

    const eventsBySection: Record<string, PrediktBoardEvent[]> = {
      all: allEvents,
      trending: trendingEvents,
      new: newestEvents,
    }

    lanes.forEach((lane) => {
      eventsBySection[lane.slug] = lane.events
    })

    const tagChipPool = dedupeMarkets([ ...trendingMarkets, ...newestMarkets ]).slice(0, 100)
    const tags = Array.from(new Set(tagChipPool.flatMap((market) => [ market.category, ...(market.events || []).map((event) => event.category) ]).filter(Boolean))).slice(0, 18) as string[]

    const featuredMarkets = trendingEvents.slice(0, 12)

    return {
      featuredMarkets,
      allMarkets,
      allEvents,
      lanes,
      eventsBySection,
      sections: boardSections,
      tags,
      totalLiveMarkets: trendingEvents.length,
      trendingMarkets,
      trendingEvents,
    }
  }, [ trendingQuery.data, newestQuery.data, politicsQuery.data, financeQuery.data, cryptoQuery.data, geopoliticsQuery.data, sportsQuery.data, techQuery.data, cultureQuery.data, climateQuery.data ])

  const isLoading = [
    trendingQuery.isLoading,
    newestQuery.isLoading,
    politicsQuery.isLoading,
    financeQuery.isLoading,
    cryptoQuery.isLoading,
    geopoliticsQuery.isLoading,
    sportsQuery.isLoading,
    techQuery.isLoading,
    cultureQuery.isLoading,
    climateQuery.isLoading,
  ].some(Boolean)

  const isFetching = [
    trendingQuery.isFetching,
    newestQuery.isFetching,
    politicsQuery.isFetching,
    financeQuery.isFetching,
    cryptoQuery.isFetching,
    geopoliticsQuery.isFetching,
    sportsQuery.isFetching,
    techQuery.isFetching,
    cultureQuery.isFetching,
    climateQuery.isFetching,
  ].some(Boolean)

  const totals = useMemo(() => {
    return Object.fromEntries(Object.entries(data.eventsBySection).map(([ key, events ]) => ([
      key,
      events.reduce((acc, event) => acc + event.volume, 0),
    ])))
  }, [ data.eventsBySection ])

  return {
    ...data,
    totals,
    isFetching,
    isLoading,
  } as const
}

export default usePrediktsMarketBrowser
