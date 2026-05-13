'use client'

import { useMemo } from 'react'
import { constants } from 'helpers'
import { usePolymarketFeaturedMarkets, type PolymarketMarket } from 'providers/polymarket'


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
    if (seen.has(market.id)) {
      return false
    }

    seen.add(market.id)
    return true
  })
}

const isMarketActive = (market: PolymarketMarket) => market.active && !market.closed

const usePrediktsMarketBrowser = () => {
  const marketsQuery = usePolymarketFeaturedMarkets(120)

  const data = useMemo(() => {
    const liveMarkets = dedupeMarkets((marketsQuery.data || []).filter(isMarketActive))
    const featuredMarkets = liveMarkets.slice(0, 6)
    const liveBoardMarkets = liveMarkets.slice(0, 24)

    const lanes = constants.prediktsTaxonomy.map((category) => {
      const searchTerms = [ category.title, ...category.items ].map(normalize)
      const categoryMarkets = liveMarkets.filter((market) => {
        const haystack = buildHaystack(market)

        return searchTerms.some((term) => haystack.includes(term))
      })

      return {
        ...category,
        markets: categoryMarkets.slice(0, 12),
        count: categoryMarkets.length,
      }
    })

    return {
      featuredMarkets,
      liveBoardMarkets,
      lanes,
      totalLiveMarkets: liveMarkets.length,
    }
  }, [ marketsQuery.data ])

  return {
    ...data,
    isFetching: marketsQuery.isFetching,
    isLoading: marketsQuery.isLoading,
  } as const
}

export default usePrediktsMarketBrowser
