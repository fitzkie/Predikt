import { type PolymarketClientConfig } from './types'


export const polymarketClientConfig: PolymarketClientConfig = {
  gammaApiUrl: process.env.NEXT_PUBLIC_POLYMARKET_GAMMA_API_URL || 'https://gamma-api.polymarket.com',
  dataApiUrl: process.env.NEXT_PUBLIC_POLYMARKET_DATA_API_URL || 'https://data-api.polymarket.com',
  clobApiUrl: process.env.NEXT_PUBLIC_POLYMARKET_CLOB_API_URL || 'https://clob.polymarket.com',
  wsUrl: process.env.NEXT_PUBLIC_POLYMARKET_WS_URL || 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
}
