'use client'

import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { usePolymarketClient, type PolymarketMarket, type PolymarketSearchResult } from 'providers/polymarket'


const uniqueMarkets = (markets: PolymarketMarket[]) => {
  const seen = new Set<string>()

  return markets.filter((market) => {
    if (seen.has(market.id)) {
      return false
    }

    seen.add(market.id)
    return true
  })
}

const extractMarkets = (result: PolymarketSearchResult): PolymarketMarket[] => {
  const directMarkets = Array.isArray(result.markets) ? result.markets : []
  const nestedMarkets = Array.isArray(result.events)
    ? result.events.flatMap((event) => Array.isArray(event.markets) ? event.markets : [])
    : []

  return uniqueMarkets([ ...directMarkets, ...nestedMarkets ])
}

const usePrediktsLaneMarkets = (terms: readonly string[], limit = 3) => {
  const client = usePolymarketClient()
  const normalizedTerms = terms.filter(Boolean)

  const queries = useQueries({
    queries: normalizedTerms.map((term) => ({
      queryKey: [ 'polymarket', 'search', 'lane', term, limit ],
      queryFn: async () => {
        const result = await client.search(term)

        return extractMarkets(result)
          .filter((market) => market.active && !market.closed)
          .slice(0, limit)
      },
      staleTime: 30_000,
      retry: 1,
      enabled: term.length >= 2,
    })),
  })

  const markets = useMemo(() => {
    return uniqueMarkets(queries.flatMap((query) => query.data || [])).slice(0, limit)
  }, [ limit, queries ])

  return {
    data: markets,
    isFetching: queries.some((query) => query.isFetching),
    isSuccess: queries.some((query) => query.isSuccess),
    queries,
  } as const
}

export default usePrediktsLaneMarkets
