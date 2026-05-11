'use client'

import { useMemo } from 'react'
import { useActiveMarkets } from '@azuro-org/sdk'
import { useAzuroGameMarketsFeed } from 'providers/azuro'

const useBetGameMarkets = (gameId?: string, enabled = true) => {
  const sdkQuery = useActiveMarkets({
    gameId: gameId || '',
    query: {
      enabled: Boolean(gameId && enabled),
      refetchInterval: 10_000,
    },
  })
  const feedQuery = useAzuroGameMarketsFeed(gameId)

  const markets = useMemo(() => {
    return feedQuery.isSuccess ? feedQuery.data : sdkQuery.data
  }, [ feedQuery.data, feedQuery.isSuccess, sdkQuery.data ])

  return {
    data: markets,
    isFetching: (feedQuery.isFetching && !feedQuery.isSuccess) || sdkQuery.isFetching,
    isPlaceholderData: sdkQuery.isPlaceholderData,
    source: feedQuery.isSuccess ? 'backend-api' : 'sdk',
    feedQuery,
    sdkQuery,
  } as const
}

export default useBetGameMarkets
