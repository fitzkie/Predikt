import { GameOrderBy, OrderDirection, groupConditionsByMarket, type GetConditionsByGameIdsResponseResult, type GetConditionsStateResult, type GetGamesByFiltersResult, type GetSportsResult } from '@azuro-org/toolkit'

import { type AzuroClientConfig, type AzuroFeedClient, type AzuroFeedGame, type AzuroFeedSportsParams, type AzuroFeedTopGamesParams } from './types'


const safeJoinUrl = (baseUrl: string, path: string) => {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

const buildUrlWithQuery = (baseUrl: string, path: string, params?: Record<string, string | number | boolean | undefined>) => {
  const url = new URL(safeJoinUrl(baseUrl, path))

  Object.entries(params || {}).forEach(([ key, value ]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    url.searchParams.set(key, String(value))
  })

  return url.toString()
}

const readJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`Azuro feed request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

const mapOrderDirection = (orderDir?: 'asc' | 'desc') => {
  return orderDir === 'asc' ? OrderDirection.Asc : OrderDirection.Desc
}

const mapOrderBy = (orderBy?: 'startsAt' | 'turnover') => {
  if (!orderBy) {
    return undefined
  }

  return orderBy === 'turnover' ? GameOrderBy.Turnover : GameOrderBy.StartsAt
}

const createPublicMarketManagerClient = (config: AzuroClientConfig) => {
  const baseParams = {
    environment: config.environment,
  }

  return {
    async getGamesByFilters(params: AzuroFeedTopGamesParams): Promise<GetGamesByFiltersResult> {
      const url = buildUrlWithQuery(config.backendApiUrl, '/market-manager/games-by-filters', {
        ...baseParams,
        gameState: params.state,
        orderBy: GameOrderBy.Turnover,
        orderDirection: OrderDirection.Desc,
        page: params.page || 1,
        perPage: params.perPage || 9,
      })
      return readJson<GetGamesByFiltersResult>(await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      }))
    },

    async getSports(params: AzuroFeedSportsParams): Promise<GetSportsResult> {
      const url = buildUrlWithQuery(config.backendApiUrl, '/market-manager/sports', {
        ...baseParams,
        gameState: params.gameState,
        sportId: Array.isArray(params.sportIds) ? params.sportIds.join(',') : params.sportIds,
        sportSlug: params.sportSlug,
        countrySlug: params.countrySlug,
        leagueSlug: params.leagueSlug,
        numberOfGames: params.numberOfGames && params.numberOfGames > 10 ? params.numberOfGames : 10,
        orderBy: mapOrderBy(params.orderBy),
        orderDirection: mapOrderDirection(params.orderDir || (params.orderBy === 'startsAt' ? 'asc' : 'desc')),
      })
      const payload = await readJson<{ sports: GetSportsResult }>(await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      }))

      return payload.sports || []
    },

    async getGamesByIds(gameIds: string[]): Promise<AzuroFeedGame[]> {
      const payload = await readJson<{ games: AzuroFeedGame[] }>(await fetch(safeJoinUrl(config.backendApiUrl, '/market-manager/games-by-ids'), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameIds }),
        cache: 'no-store',
      }))

      return payload.games || []
    },

    async getConditionsByGameIds(gameIds: string[]): Promise<GetConditionsByGameIdsResponseResult> {
      const payload = await readJson<{ conditions: GetConditionsByGameIdsResponseResult }>(await fetch(safeJoinUrl(config.backendApiUrl, '/market-manager/conditions-by-game-ids'), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameIds,
          environment: config.environment,
        }),
        cache: 'no-store',
      }))

      return payload.conditions || []
    },

    async getConditionsState(conditionIds: string[]): Promise<GetConditionsStateResult> {
      const payload = await readJson<{ conditions: GetConditionsStateResult }>(await fetch(safeJoinUrl(config.backendApiUrl, '/market-manager/condition-batch'), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conditionIds }),
        cache: 'no-store',
      }))

      return payload.conditions || []
    },
  }
}

export const createAzuroFeedClient = (config: AzuroClientConfig): AzuroFeedClient => {
  const client = createPublicMarketManagerClient(config)

  return {
    async getTopGames(params) {
      const payload = await client.getGamesByFilters(params)

      return payload.games || []
    },

    getGamesByFilters: client.getGamesByFilters,

    getSports: client.getSports,

    async getGameById(gameId: string) {
      const games = await client.getGamesByIds([ gameId ])

      return games[0] || null
    },

    async getGameMarkets(gameId: string) {
      const conditions = await client.getConditionsByGameIds([ gameId ])

      return groupConditionsByMarket(conditions)
    },

    getConditionsState: client.getConditionsState,
  }
}
