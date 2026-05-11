export type PolymarketEvent = {
  id: string
  ticker?: string
  slug: string
  title: string
  description?: string
  category?: string
  image?: string
  icon?: string
  active?: boolean
  closed?: boolean
  volume?: number
  volume24hr?: number
  liquidity?: number
  markets?: PolymarketMarket[]
  [key: string]: unknown
}

export type PolymarketMarket = {
  id: string
  question: string
  slug: string
  conditionId?: string
  category?: string
  description?: string
  image?: string
  icon?: string
  active?: boolean
  closed?: boolean
  restricted?: boolean
  liquidity?: string | number
  volume?: string | number
  volume24hr?: number
  endDate?: string
  startDate?: string
  outcomes?: string
  outcomePrices?: string
  clobTokenIds?: string
  enableOrderBook?: boolean
  orderPriceMinTickSize?: number
  orderMinSize?: number
  events?: PolymarketEvent[]
  [key: string]: unknown
}

export type PolymarketTag = {
  id: string
  label: string
  slug: string
  [key: string]: unknown
}

export type PolymarketOrderBook = {
  market: string
  asset_id: string
  timestamp: string
  hash: string
  bids: Array<{ price: string, size: string }>
  asks: Array<{ price: string, size: string }>
  min_order_size: string
  tick_size: string
  neg_risk: boolean
  last_trade_price: string
}

export type PolymarketPosition = {
  proxyWallet: string
  asset: string
  conditionId: string
  size: number
  avgPrice: number
  currentValue: number
  cashPnl: number
  percentPnl: number
  realizedPnl: number
  curPrice: number
  redeemable: boolean
  mergeable: boolean
  title: string
  slug: string
  icon?: string
  eventSlug?: string
  outcome: string
  outcomeIndex: number
  oppositeOutcome?: string
  endDate?: string
  negativeRisk?: boolean
  [key: string]: unknown
}

export type PolymarketActivity = {
  proxyWallet: string
  timestamp: number
  conditionId: string
  type: string
  size: number
  usdcSize: number
  transactionHash: string
  price?: number
  asset?: string
  side?: 'BUY' | 'SELL'
  outcomeIndex?: number
  title?: string
  slug?: string
  icon?: string
  eventSlug?: string
  outcome?: string
  [key: string]: unknown
}

export type PolymarketSearchResult = {
  events?: PolymarketEvent[]
  markets?: PolymarketMarket[]
  profiles?: Array<Record<string, unknown>>
}

export type PolymarketApiCredentials = {
  apiKey: string
  passphrase: string
  secret: string
  walletAddress?: string
  createdAt?: string
}

export type PolymarketOpenOrder = {
  id: string
  status: string
  owner: string
  maker_address: string
  market: string
  asset_id: string
  side: string
  original_size: string
  size_matched: string
  price: string
  associate_trades: string[]
  outcome: string
  created_at: number
  expiration: string
  order_type: string
}

export type PolymarketOrderResponse = {
  success: boolean
  errorMsg: string
  orderID: string
  transactionsHashes?: string[]
  tradeIDs?: string[]
  status: string
  takingAmount: string
  makingAmount: string
}

export type PolymarketBalanceAllowance = {
  balance: string
  allowances: Record<string, string>
}

export type PolymarketRealtimeBookEvent = {
  event_type: 'book' | 'price_change' | 'tick_size_change' | 'last_trade_price' | 'best_bid_ask' | 'new_market' | 'market_resolved'
  asset_id: string
  market?: string
  bids?: Array<{ price: string, size: string }>
  asks?: Array<{ price: string, size: string }>
  price_changes?: Array<{ price: string, size: string, side: 'BUY' | 'SELL', best_bid?: string, best_ask?: string }>
  last_trade_price?: string
  best_bid?: string
  best_ask?: string
  spread?: string
  [key: string]: unknown
}

export interface PolymarketClient {
  getMarkets(params?: Record<string, string | number | boolean | undefined>): Promise<PolymarketMarket[]>
  getEvents(params?: Record<string, string | number | boolean | undefined>): Promise<PolymarketEvent[]>
  getTags(): Promise<PolymarketTag[]>
  search(query: string): Promise<PolymarketSearchResult>
  getMarketBySlug(slug: string): Promise<PolymarketMarket | null>
  getOrderBook(tokenId: string): Promise<PolymarketOrderBook | null>
  getPositions(user: string): Promise<PolymarketPosition[]>
  getActivity(user: string): Promise<PolymarketActivity[]>
}

export interface PolymarketRealtimeClient {
  connect(): void
  disconnect(): void
  subscribe(tokenIds: string[], listener: (event: PolymarketRealtimeBookEvent) => void): () => void
}

export type PolymarketClientConfig = {
  gammaApiUrl: string
  dataApiUrl: string
  clobApiUrl: string
  wsUrl: string
}
