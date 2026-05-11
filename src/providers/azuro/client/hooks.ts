'use client'

import { useQuery } from '@tanstack/react-query'

import { useAzuroClients } from './AzuroClientContext'
import { azuroClientConfig } from './config'
import { type AzuroFeedSportsParams, type AzuroFeedTopGamesParams } from './types'


export const useAzuroTopGames = (params: AzuroFeedTopGamesParams) => {
  const { feed } = useAzuroClients()
  const isEnabled = Boolean(azuroClientConfig.backendApiUrl)

  return useQuery({
    queryKey: [ 'azuro', 'feed', 'top-games', params ],
    queryFn: () => feed.getTopGames(params),
    enabled: isEnabled,
    staleTime: 30_000,
    retry: 1,
  })
}

export const useAzuroUserBetHistoryRaw = (wallet?: string | null) => {
  const { history } = useAzuroClients()
  const normalizedWallet = wallet?.toLowerCase()
  const isEnabled = Boolean(normalizedWallet && azuroClientConfig.graphApiUrl)

  return useQuery({
    queryKey: [ 'azuro', 'history', 'bets', normalizedWallet ],
    queryFn: () => history.getUserBetHistory(normalizedWallet!),
    enabled: isEnabled,
    staleTime: 15_000,
    retry: 1,
  })
}

export const useAzuroSportsFeed = (params: AzuroFeedSportsParams) => {
  const { feed } = useAzuroClients()
  const queryKey = [ 'azuro', 'feed', 'sports', params ]
  const isEnabled = Boolean(azuroClientConfig.backendApiUrl)

  return useQuery({
    queryKey,
    queryFn: () => feed.getSports(params),
    enabled: isEnabled,
    staleTime: 30_000,
    retry: 1,
  })
}

export const useAzuroGameFeed = (gameId?: string) => {
  const { feed } = useAzuroClients()
  const isEnabled = Boolean(gameId && azuroClientConfig.backendApiUrl)

  return useQuery({
    queryKey: [ 'azuro', 'feed', 'game', gameId ],
    queryFn: () => feed.getGameById(gameId!),
    enabled: isEnabled,
    staleTime: 15_000,
    retry: 1,
  })
}

export const useAzuroGameMarketsFeed = (gameId?: string) => {
  const { feed } = useAzuroClients()
  const isEnabled = Boolean(gameId && azuroClientConfig.backendApiUrl)

  return useQuery({
    queryKey: [ 'azuro', 'feed', 'game-markets', gameId ],
    queryFn: () => feed.getGameMarkets(gameId!),
    enabled: isEnabled,
    staleTime: 10_000,
    retry: 1,
  })
}
