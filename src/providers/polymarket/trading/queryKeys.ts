export const getPolymarketOpenOrdersQueryKey = (assetIds?: string[]) => {
  const normalizedAssetIds = Array.from(new Set((assetIds || []).filter(Boolean))).sort()

  return [ 'polymarket', 'trading', 'open-orders', normalizedAssetIds ] as const
}
