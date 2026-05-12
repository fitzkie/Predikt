import { type PolymarketClientConfig } from './types'


export const polymarketClientConfig: PolymarketClientConfig = {
  gammaApiUrl: process.env.NEXT_PUBLIC_POLYMARKET_GAMMA_API_URL || '/api/polymarket/gamma',
  dataApiUrl: process.env.NEXT_PUBLIC_POLYMARKET_DATA_API_URL || '/api/polymarket/data',
  clobApiUrl: process.env.NEXT_PUBLIC_POLYMARKET_CLOB_API_URL || '/api/polymarket/clob',
  wsUrl: process.env.NEXT_PUBLIC_POLYMARKET_WS_URL || 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
}
