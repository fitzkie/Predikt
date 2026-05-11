'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'

import { usePolymarketClient, usePolymarketRealtime } from './PolymarketClientContext'
import { type PolymarketMarket, type PolymarketRealtimeBookEvent } from './types'
import { parsePolymarketTokenIds } from './utils'


export const usePolymarketFeaturedMarkets = (limit = 6) => {
  const client = usePolymarketClient()

  return useQuery({
    queryKey: [ 'polymarket', 'markets', 'featured', limit ],
    queryFn: () => client.getMarkets({
      active: true,
      closed: false,
      limit,
      order: 'volume24hr',
      ascending: false,
    }),
    staleTime: 30_000,
    retry: 1,
  })
}

export const usePolymarketSearchMarkets = (query: string, limit = 6) => {
  const client = usePolymarketClient()
  const normalizedQuery = query.trim()

  return useQuery({
    queryKey: [ 'polymarket', 'search', normalizedQuery, limit ],
    queryFn: async () => {
      const result = await client.search(normalizedQuery)
      const markets = result.markets || []

      return markets
        .filter((market) => market.active && !market.closed)
        .slice(0, limit)
    },
    enabled: normalizedQuery.length >= 2,
    staleTime: 30_000,
    retry: 1,
  })
}

export const usePolymarketTags = () => {
  const client = usePolymarketClient()

  return useQuery({
    queryKey: [ 'polymarket', 'tags' ],
    queryFn: () => client.getTags(),
    staleTime: 60_000,
    retry: 1,
  })
}

export const usePolymarketEvents = (limit = 6) => {
  const client = usePolymarketClient()

  return useQuery({
    queryKey: [ 'polymarket', 'events', limit ],
    queryFn: () => client.getEvents({
      closed: false,
      limit,
    }),
    staleTime: 30_000,
    retry: 1,
  })
}

export const usePolymarketMarketBySlug = (slug?: string) => {
  const client = usePolymarketClient()
  const normalizedSlug = slug?.trim()

  return useQuery({
    queryKey: [ 'polymarket', 'market', normalizedSlug ],
    queryFn: () => client.getMarketBySlug(normalizedSlug!),
    enabled: Boolean(normalizedSlug),
    staleTime: 30_000,
    retry: 1,
  })
}

export const usePolymarketPositions = (user?: string | null) => {
  const client = usePolymarketClient()
  const normalizedUser = user?.toLowerCase()

  return useQuery({
    queryKey: [ 'polymarket', 'positions', normalizedUser ],
    queryFn: () => client.getPositions(normalizedUser!),
    enabled: Boolean(normalizedUser),
    staleTime: 15_000,
    retry: 1,
  })
}

export const usePolymarketActivity = (user?: string | null) => {
  const client = usePolymarketClient()
  const normalizedUser = user?.toLowerCase()

  return useQuery({
    queryKey: [ 'polymarket', 'activity', normalizedUser ],
    queryFn: () => client.getActivity(normalizedUser!),
    enabled: Boolean(normalizedUser),
    staleTime: 15_000,
    retry: 1,
  })
}

export const usePolymarketOrderBook = (tokenId?: string) => {
  const client = usePolymarketClient()

  return useQuery({
    queryKey: [ 'polymarket', 'book', tokenId ],
    queryFn: () => client.getOrderBook(tokenId!),
    enabled: Boolean(tokenId),
    staleTime: 15_000,
    retry: 1,
  })
}

const patchOrderBook = (book: ReturnType<typeof usePolymarketOrderBook>['data'], event: PolymarketRealtimeBookEvent) => {
  if (!book) {
    return book
  }

  if (event.event_type === 'book') {
    return {
      ...book,
      bids: event.bids || book.bids,
      asks: event.asks || book.asks,
    }
  }

  if (event.event_type === 'best_bid_ask') {
    const bids = event.best_bid ? [{ price: String(event.best_bid), size: book.bids[0]?.size || '0' }, ...book.bids.slice(1)] : book.bids
    const asks = event.best_ask ? [{ price: String(event.best_ask), size: book.asks[0]?.size || '0' }, ...book.asks.slice(1)] : book.asks

    return {
      ...book,
      bids,
      asks,
    }
  }

  if (event.event_type === 'last_trade_price' && event.last_trade_price) {
    return {
      ...book,
      last_trade_price: String(event.last_trade_price),
    }
  }

  return book
}

export const usePolymarketOrderBookStream = (market?: PolymarketMarket | null) => {
  const realtime = usePolymarketRealtime()
  const queryClient = useQueryClient()
  const tokenIds = parsePolymarketTokenIds(market)

  useEffect(() => {
    if (!tokenIds.length) {
      return
    }

    const unsubscribe = realtime.subscribe(tokenIds, (event) => {
      queryClient.setQueryData([ 'polymarket', 'book', event.asset_id ], (current) => {
        return patchOrderBook(current as ReturnType<typeof usePolymarketOrderBook>['data'], event)
      })
    })

    return () => {
      unsubscribe()
    }
  }, [ queryClient, realtime, tokenIds.join('-') ])
}
