export type MarketSource = 'azuro' | 'polymarket'

export type MarketOutcome = {
  id: string
  label: string
  price: number
  probability?: number
  change24h?: number
}

export type MarketListItem = {
  id: string
  title: string
  subtitle?: string
  category: string
  status: 'prematch' | 'live' | 'closed' | 'resolved'
  outcomes: MarketOutcome[]
  source: MarketSource
  startsAt?: string
  resolvesAt?: string
}

export type PositionSummary = {
  marketId: string
  source: MarketSource
  side: string
  averagePrice: number
  sizeUsd: number
  currentValueUsd?: number
  pnlUsd?: number
  status: 'open' | 'closed' | 'resolved'
}
