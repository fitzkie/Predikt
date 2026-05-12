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
    perPage: 10,
    orderBy: GameOrderBy.Turnover,
    isLive,
  })
  const feedQuery = useAzuroTopGames({
    state: isLive ? 'Live' : 'Prematch',
    perPage: 10,
  })

  const games = useMemo(() => {
    if (feedQuery.isSuccess) {
      return feedQuery.data
        .map(normalizeAzuroFeedGame)
        .filter(Boolean)
        .slice(0, 9) as GameData[]
    }

    return sdkQuery.data?.games?.slice(0, 9) || []
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
