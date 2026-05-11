'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { type GameData, type GameMarkets } from '@azuro-org/toolkit'

import { useAzuroClients } from './AzuroClientContext'
import { type AzuroRealtimeConditionPayload, type AzuroRealtimeEvent, type AzuroRealtimeGamePayload } from './types'


type UseAzuroRealtimeRefreshProps = {
  channels?: string[]
  queryKeys: unknown[][]
  enabled?: boolean
}

const toGameId = (payload: AzuroRealtimeGamePayload | AzuroRealtimeConditionPayload) => {
  return String(payload.gameId || payload.id || '')
}

const toConditionId = (payload: AzuroRealtimeConditionPayload) => {
  return String(payload.conditionId || payload.id || '')
}

const patchGame = (game: GameData, payload: AzuroRealtimeGamePayload) => {
  const payloadGameId = toGameId(payload)

  if (!payloadGameId || game.gameId !== payloadGameId) {
    return game
  }

  return {
    ...game,
    state: (payload.state as GameData['state']) || game.state,
    startsAt: typeof payload.startsAt === 'string' ? payload.startsAt : game.startsAt,
    title: typeof payload.title === 'string' ? payload.title : game.title,
    slug: typeof payload.slug === 'string' ? payload.slug : game.slug,
  }
}

const patchGames = (games: GameData[] | undefined, payload: AzuroRealtimeGamePayload) => {
  if (!games?.length) {
    return games
  }

  return games.map((game) => patchGame(game, payload))
}

const patchSports = (
  sports: Array<{
    countries: Array<{
      leagues: Array<{
        games: GameData[]
      }>
    }>
  }> | undefined,
  payload: AzuroRealtimeGamePayload
) => {
  if (!sports?.length) {
    return sports
  }

  return sports.map((sport) => ({
    ...sport,
    countries: sport.countries.map((country) => ({
      ...country,
      leagues: country.leagues.map((league) => ({
        ...league,
        games: patchGames(league.games, payload) || league.games,
      })),
    })),
  }))
}

const patchMarkets = (markets: GameMarkets | undefined, payload: AzuroRealtimeConditionPayload) => {
  if (!markets?.length) {
    return markets
  }

  const conditionId = toConditionId(payload)

  if (!conditionId) {
    return markets
  }

  return markets.map((market) => ({
    ...market,
    conditions: market.conditions.map((condition) => {
      if (condition.conditionId !== conditionId) {
        return condition
      }

      return {
        ...condition,
        state: payload.state !== undefined ? payload.state as typeof condition.state : condition.state,
        outcomes: condition.outcomes.map((outcome) => {
          const updatedOutcome = payload.outcomes?.find(({ outcomeId, id }) => {
            return String(outcomeId || id || '') === outcome.outcomeId
          })

          if (!updatedOutcome) {
            return outcome
          }

          const nextOdds = updatedOutcome.currentOdds ?? updatedOutcome.odds

          return {
            ...outcome,
            odds: nextOdds ? Number(nextOdds) : outcome.odds,
          }
        }),
      }
    }),
  }))
}

const patchRealtimeQueryCaches = (queryClient: ReturnType<typeof useQueryClient>, event: AzuroRealtimeEvent) => {
  if (event.type === 'game_update') {
    const payload = event.payload as AzuroRealtimeGamePayload

    queryClient.setQueriesData({ queryKey: [ 'azuro', 'feed', 'game' ] }, (current) => {
      return current ? patchGame(current as GameData, payload) : current
    })

    queryClient.setQueriesData({ queryKey: [ 'azuro', 'feed', 'top-games' ] }, (current) => {
      return patchGames(current as GameData[] | undefined, payload)
    })

    queryClient.setQueriesData({ queryKey: [ 'azuro', 'feed', 'sports' ] }, (current) => {
      return patchSports(current as Parameters<typeof patchSports>[0], payload)
    })
  }

  if (event.type === 'condition_update') {
    const payload = event.payload as AzuroRealtimeConditionPayload

    queryClient.setQueriesData({ queryKey: [ 'azuro', 'feed', 'game-markets' ] }, (current) => {
      return patchMarkets(current as GameMarkets | undefined, payload)
    })
  }
}

export const useAzuroRealtimeRefresh = (props: UseAzuroRealtimeRefreshProps) => {
  const { channels = [ '*' ], queryKeys, enabled = true } = props
  const { realtime } = useAzuroClients()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) {
      return
    }

    const unsubscribers = channels.map((channel) => {
      return realtime.subscribe(channel, (event) => {
        patchRealtimeQueryCaches(queryClient, event)

        queryKeys.forEach((queryKey) => {
          void queryClient.invalidateQueries({ queryKey })
        })
      })
    })

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [ channels, enabled, queryClient, queryKeys, realtime ])
}
