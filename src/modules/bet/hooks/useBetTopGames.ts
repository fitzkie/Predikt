'use client'

import { useMemo } from 'react'
import { GameOrderBy, type GameData } from '@azuro-org/toolkit'
import { useGames } from '@azuro-org/sdk'
import { useLive } from '@azuro-org/sdk'
import { useAzuroTopGames } from 'providers/azuro'
import { normalizeAzuroFeedGame } from 'modules/bet/lib/normalizeFeedGame'

const useBetTopGames = () => {
  const { isLive } = useLive()
  const sdkQuery = useGames({
    perPage: 9,
    orderBy: GameOrderBy.Turnover,
    isLive,
  })
  const feedQuery = useAzuroTopGames({
    state: isLive ? 'Live' : 'Prematch',
    perPage: 9,
  })

  const games = useMemo(() => {
    if (feedQuery.isSuccess) {
      return feedQuery.data
        .map(normalizeAzuroFeedGame)
        .filter(Boolean) as GameData[]
    }

    return sdkQuery.data?.games || []
  }, [ feedQuery.data, sdkQuery.data ])

  return {
    games,
    isFetching: (feedQuery.isFetching && !feedQuery.isSuccess) || sdkQuery.isFetching,
    source: feedQuery.isSuccess ? 'backend-api' : 'sdk',
    feedQuery,
    sdkQuery,
  } as const
}

export default useBetTopGames
