import { type ChainId, type GameData, type GameMarkets, type GetConditionsByGameIdsResponseResult, type GetConditionsStateResult, type GetGamesByFiltersResult, type GetSportsResult } from '@azuro-org/toolkit'


export type AzuroFeedTopGamesParams = {
  state: 'Live' | 'Prematch'
  page?: number
  perPage?: number
}

export type AzuroFeedSportsParams = {
  gameState: 'Live' | 'Prematch'
  sportIds?: (string | number) | (string | number)[]
  sportSlug?: string
  countrySlug?: string
  leagueSlug?: string
  numberOfGames?: number
  orderBy?: 'startsAt' | 'turnover'
  orderDir?: 'asc' | 'desc'
}

export type AzuroFeedGame = GameData
export type AzuroFeedSport = GetSportsResult[number]
export type AzuroFeedConditions = GetConditionsByGameIdsResponseResult
export type AzuroFeedConditionState = GetConditionsStateResult[number]
export type AzuroFeedGameMarkets = GameMarkets

export type AzuroRealtimeEnvelope = {
  event?: string
  data?: Record<string, unknown> | null
}

export type AzuroRealtimeConditionPayload = {
  id?: string
  conditionId?: string
  gameId?: string
  state?: string | number
  outcomes?: Array<{
    id?: string
    outcomeId?: string
    odds?: string | number
    currentOdds?: string | number
  }>
  [key: string]: unknown
}

export type AzuroRealtimeGamePayload = {
  id?: string
  gameId?: string
  state?: string
  startsAt?: string
  title?: string
  slug?: string
  [key: string]: unknown
}

export type AzuroRealtimeEvent<T = unknown> = {
  type: 'condition_update' | 'game_update' | 'unknown'
  payload: T
  raw?: unknown
}

export type AzuroGraphResponse<T> = {
  data?: T
  errors?: Array<{ message: string }>
}

export interface AzuroFeedClient {
  getTopGames(params: AzuroFeedTopGamesParams): Promise<AzuroFeedGame[]>
  getSports(params: AzuroFeedSportsParams): Promise<AzuroFeedSport[]>
  getGameById(gameId: string): Promise<AzuroFeedGame | null>
  getGameMarkets(gameId: string): Promise<AzuroFeedGameMarkets>
  getConditionsState(conditionIds: string[]): Promise<GetConditionsStateResult>
  getGamesByFilters(params: AzuroFeedTopGamesParams): Promise<GetGamesByFiltersResult>
}

export interface AzuroHistoryClient {
  getUserBetHistory(wallet: string): Promise<unknown[]>
  getUserTransactions(wallet: string): Promise<unknown[]>
}

export interface AzuroRealtimeClient {
  connect(): void
  disconnect(): void
  subscribe(channel: string, listener: (event: AzuroRealtimeEvent) => void): () => void
  send(message: unknown): void
}

export type AzuroClientConfig = {
  chainId: ChainId
  environment: string
  backendApiUrl: string
  graphApiUrl: string
  wsUrl: string
}
