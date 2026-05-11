import { type PolymarketMarket } from './types'


export const parsePolymarketTokenIds = (market?: PolymarketMarket | null) => {
  if (!market?.clobTokenIds) {
    return []
  }

  try {
    const parsed = JSON.parse(market.clobTokenIds)

    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  }
  catch {
    return []
  }
}

export const parsePolymarketOutcomePrices = (market?: PolymarketMarket | null) => {
  if (!market?.outcomePrices) {
    return []
  }

  try {
    const parsed = JSON.parse(market.outcomePrices)

    return Array.isArray(parsed) ? parsed.map((value) => Number(value)) : []
  }
  catch {
    return []
  }
}

export const parsePolymarketOutcomes = (market?: PolymarketMarket | null) => {
  if (!market?.outcomes) {
    return []
  }

  try {
    const parsed = JSON.parse(market.outcomes)

    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  }
  catch {
    return []
  }
}
