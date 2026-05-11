'use client'

import { useQuery } from '@tanstack/react-query'

import { usePolymarketTrading } from './PolymarketTradingContext'
import { getPolymarketOpenOrdersQueryKey } from './queryKeys'


type OrderReadinessArgs = {
  tokenId?: string
  side: 'BUY' | 'SELL'
  orderMode: 'LIMIT' | 'MARKET'
  price?: number
  size?: number
  amount?: number
}

export const usePolymarketOpenOrders = (assetIds?: string[]) => {
  const trading = usePolymarketTrading()
  const normalizedAssetIds = Array.from(new Set((assetIds || []).filter(Boolean))).sort()
  const shouldFetchAll = assetIds === undefined

  return useQuery({
    queryKey: getPolymarketOpenOrdersQueryKey(normalizedAssetIds),
    queryFn: () => trading.getOpenOrders(normalizedAssetIds),
    enabled: trading.isExecutionEnabled && trading.isWalletConnected && trading.hasCredentials && (shouldFetchAll || normalizedAssetIds.length > 0),
    staleTime: 15_000,
    retry: 1,
  })
}

export const usePolymarketOrderReadiness = (args: OrderReadinessArgs) => {
  const trading = usePolymarketTrading()
  const { tokenId, side, orderMode, price, size, amount } = args
  const requiredValue = orderMode === 'LIMIT' ? size : amount
  const hasNumericAmount = typeof requiredValue === 'number' && !Number.isNaN(requiredValue) && requiredValue > 0
  const needsPrice = orderMode === 'LIMIT'
  const hasValidPrice = !needsPrice || (typeof price === 'number' && !Number.isNaN(price) && price > 0 && price < 1)
  const hasToken = Boolean(tokenId)

  return useQuery({
    queryKey: [ 'polymarket', 'trading', 'readiness', tokenId, side, orderMode, price, size, amount ],
    queryFn: () => trading.checkOrderReadiness({
      tokenId: tokenId!,
      side,
      orderMode,
      price,
      size,
      amount,
    }),
    enabled: trading.isExecutionEnabled && trading.isWalletConnected && trading.hasCredentials && hasToken && hasNumericAmount && hasValidPrice,
    staleTime: 10_000,
    retry: 1,
  })
}
