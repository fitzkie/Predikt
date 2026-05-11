'use client'

import { useMemo } from 'react'
import { useAzuroRealtimeRefresh } from 'providers/azuro'


const SPORTSBOOK_QUERY_KEYS = [
  [ 'azuro', 'feed', 'top-games' ],
  [ 'azuro', 'feed', 'sports' ],
] as unknown[][]

const SPORTSBOOK_CHANNELS = [
  '*',
  'game_update',
  'market_update',
  'odds_update',
  'condition_update',
] as string[]

const useBetLiveRefresh = (enabled = true, gameId?: string) => {
  const queryKeys = useMemo(() => {
    const keys = [ ...SPORTSBOOK_QUERY_KEYS ]

    if (gameId) {
      keys.push([ 'azuro', 'feed', 'game', gameId ])
      keys.push([ 'azuro', 'feed', 'game-markets', gameId ])
    }

    return keys
  }, [ gameId ])
  const channels = useMemo(() => SPORTSBOOK_CHANNELS, [])

  useAzuroRealtimeRefresh({
    channels,
    queryKeys,
    enabled,
  })
}

export default useBetLiveRefresh
