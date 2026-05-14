import { type PolymarketActivity, type PolymarketClient, type PolymarketClientConfig, type PolymarketEvent, type PolymarketMarket, type PolymarketOrderBook, type PolymarketPosition, type PolymarketSearchResult, type PolymarketTag } from './types'


const safeJoinUrl = (baseUrl: string, path: string) => {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

const buildUrlWithQuery = (baseUrl: string, path: string, params?: Record<string, string | number | boolean | undefined>) => {
  const joinedUrl = safeJoinUrl(baseUrl, path)
  const url = joinedUrl.startsWith('http')
    ? new URL(joinedUrl)
    : new URL(joinedUrl, typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin)

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
    throw new Error(`Polymarket request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const createPolymarketClient = (config: PolymarketClientConfig): PolymarketClient => {
  return {
    async getMarkets(params) {
      const requestedLimit = Number(params?.limit || 100)
      const requestedOffset = Number(params?.offset || 0)
      const pageSize = Math.min(Math.max(requestedLimit, 1), 100)
      const pageCount = Math.max(1, Math.ceil(requestedLimit / 100))
      const collected: PolymarketMarket[] = []

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        const url = buildUrlWithQuery(config.gammaApiUrl, '/markets', {
          ...params,
          limit: pageSize,
          offset: requestedOffset + (pageIndex * 100),
        })

        const page = await readJson<PolymarketMarket[]>(await fetch(url, {
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
        }))

        collected.push(...page)

        if (page.length < pageSize) {
          break
        }
      }

      return collected.slice(0, requestedLimit)
    },

    async getEvents(params) {
      const url = buildUrlWithQuery(config.gammaApiUrl, '/events', params)

      return readJson<PolymarketEvent[]>(await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      }))
    },

    async getEventBySlug(slug) {
      const url = buildUrlWithQuery(config.gammaApiUrl, '/events', {
        slug,
        limit: 1,
      })
      const payload = await readJson<PolymarketEvent[]>(await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      }))

      return payload[0] || null
    },

    async getTags() {
      const url = safeJoinUrl(config.gammaApiUrl, '/tags')

      return readJson<PolymarketTag[]>(await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      }))
    },

    async search(query) {
      const url = buildUrlWithQuery(config.gammaApiUrl, '/public-search', {
        q: query,
      })

      return readJson<PolymarketSearchResult>(await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      }))
    },

    async getMarketBySlug(slug) {
      const url = safeJoinUrl(config.gammaApiUrl, `/markets/slug/${slug}`)
      const payload = await readJson<PolymarketMarket>(await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      }))

      return payload || null
    },

    async getOrderBook(tokenId) {
      const url = buildUrlWithQuery(config.clobApiUrl, '/book', {
        token_id: tokenId,
      })
      const payload = await readJson<PolymarketOrderBook>(await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      }))

      return payload || null
    },

    async getPositions(user) {
      const url = buildUrlWithQuery(config.dataApiUrl, '/positions', {
        user,
      })

      return readJson<PolymarketPosition[]>(await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      }))
    },

    async getActivity(user) {
      const url = buildUrlWithQuery(config.dataApiUrl, '/activity', {
        user,
        sortBy: 'TIMESTAMP',
        sortDirection: 'DESC',
      })

      return readJson<PolymarketActivity[]>(await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      }))
    },
  }
}
