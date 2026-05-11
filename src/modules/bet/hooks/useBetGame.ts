'use client'

import { useMemo } from 'react'
import { useGame } from '@azuro-org/sdk'
import { type GameData } from '@azuro-org/toolkit'
import { useAzuroGameFeed } from 'providers/azuro'

import { normalizeAzuroFeedGame } from 'modules/bet/lib/normalizeFeedGame'


const useBetGame = (gameId?: string) => {
  const sdkQuery = useGame({
    gameId: gameId || '',
  })
  const feedQuery = useAzuroGameFeed(gameId)

  const game = useMemo<GameData | null | undefined>(() => {
    if (feedQuery.isSuccess) {
      return feedQuery.data ? normalizeAzuroFeedGame(feedQuery.data) : null
    }

    return sdkQuery.data
  }, [ feedQuery.data, feedQuery.isSuccess, sdkQuery.data ])

  return {
    data: game,
    isFetching: (feedQuery.isFetching && !feedQuery.isSuccess) || sdkQuery.isFetching,
    source: feedQuery.isSuccess ? 'backend-api' : 'sdk',
    feedQuery,
    sdkQuery,
  } as const
}

export default useBetGame
