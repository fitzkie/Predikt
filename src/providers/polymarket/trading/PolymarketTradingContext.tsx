'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWallet } from 'wallet'
import { polygon } from 'viem/chains'
import { useAnalytics } from 'providers/analytics'

import { type PolymarketOpenOrder } from 'providers/polymarket/client'


type PolymarketOrderReadiness = {
  assetType: 'COLLATERAL' | 'CONDITIONAL'
  tokenId?: string
  requiredAmount: number
  balance: number
  maxAllowance: number
  allowanceTargets: Record<string, string>
  isBalanceSufficient: boolean
  isAllowanceSufficient: boolean
  reason: string | null
}

type PolymarketTradingContextValue = {
  mode: 'custodial'
  isWalletConnected: boolean
  isReadyForAuthentication: boolean
  isOnSupportedChain: boolean
  isExecutionEnabled: boolean
  hasCredentials: boolean
  isAuthenticating: boolean
  isDeployingSafe: boolean
  isSubmittingOrder: boolean
  isRefreshingOrders: boolean
  isCheckingReadiness: boolean
  isFixingAllowance: boolean
  isCancellingOrderId: string | null
  authError: string | null
  executionError: string | null
  lastExecutionMessage: string | null
  debugLog: string[]
  statusMessage: string
  userBalance: number
  platformAddress: string
  createOrDeriveApiKey: () => Promise<null>
  checkOrderReadiness: (input: { tokenId: string; side: string; orderMode: string; price?: number; size?: number; amount?: number }) => Promise<PolymarketOrderReadiness | null>
  fixAllowance: () => Promise<boolean>
  placeLimitOrder: (input: { tokenId: string; price: number; size: number; side: 'BUY' | 'SELL'; marketQuestion?: string; marketSlug?: string }) => Promise<any>
  placeMarketOrder: (input: { tokenId: string; amount: number; side: 'BUY' | 'SELL'; price?: number; orderType?: string; marketQuestion?: string; marketSlug?: string }) => Promise<any>
  getOpenOrders: (assetIds?: string[]) => Promise<PolymarketOpenOrder[]>
  cancelOrder: (orderId: string) => Promise<boolean>
}

const Context = createContext<PolymarketTradingContextValue | null>(null)

export const PolymarketTradingBoundary: React.CFC = ({ children }) => {
  const { account, chainId } = useWallet()
  const queryClient = useQueryClient()
  const analytics = useAnalytics()

  const [ isSubmittingOrder, setSubmittingOrder ] = useState(false)
  const [ isRefreshingOrders, setRefreshingOrders ] = useState(false)
  const [ executionError, setExecutionError ] = useState<string | null>(null)
  const [ lastExecutionMessage, setLastExecutionMessage ] = useState<string | null>(null)
  const [ userBalance, setUserBalance ] = useState(0)
  const [ platformAddress, setPlatformAddress ] = useState('')
  const balanceFetchedForRef = useRef<string | null>(null)

  const isOnSupportedChain = chainId === polygon.id
  const isExecutionEnabled = process.env.NEXT_PUBLIC_POLYMARKET_TRADING_ENABLED !== 'false'
  const userAddress = account?.toLowerCase() ?? null

  // Fetch user balance from our internal ledger whenever the wallet address changes
  useEffect(() => {
    if (!userAddress || balanceFetchedForRef.current === userAddress) return

    balanceFetchedForRef.current = userAddress

    fetch(`/api/predikts/balance?address=${userAddress}`)
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.balance === 'number') setUserBalance(data.balance)
      })
      .catch(() => {})

    fetch('/api/predikts/deposit')
      .then((r) => r.json())
      .then((data) => {
        if (data.depositAddress) setPlatformAddress(data.depositAddress)
      })
      .catch(() => {})
  }, [ userAddress ])

  const refreshBalance = useCallback(async () => {
    if (!userAddress) return

    try {
      const r = await fetch(`/api/predikts/balance?address=${userAddress}`)
      const data = await r.json()

      if (typeof data.balance === 'number') setUserBalance(data.balance)
    }
    catch {}
  }, [ userAddress ])

  const invalidateTradingQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [ 'polymarket', 'trading', 'open-orders' ] }),
      queryClient.invalidateQueries({ queryKey: [ 'polymarket', 'trading', 'readiness' ] }),
      queryClient.invalidateQueries({ queryKey: [ 'polymarket', 'positions' ] }),
      queryClient.invalidateQueries({ queryKey: [ 'polymarket', 'activity' ] }),
    ])
  }, [ queryClient ])

  // In the custodial model these are always satisfied — the platform wallet handles credentials.
  const createOrDeriveApiKey = useCallback(async () => null, [])
  const fixAllowance = useCallback(async () => true, [])

  const checkOrderReadiness = useCallback(async (input: { tokenId: string; side: string; orderMode: string; price?: number; size?: number; amount?: number }) => {
    const isBuy = input.side === 'BUY'
    const requiredAmount = isBuy
      ? (input.orderMode === 'LIMIT' ? (input.price || 0) * (input.size || 0) : (input.amount || 0))
      : (input.size || input.amount || 0)

    const isBalanceSufficient = isBuy ? userBalance >= requiredAmount : true
    const reason = !isBalanceSufficient
      ? `Insufficient balance. You have $${userBalance.toFixed(2)} but need $${requiredAmount.toFixed(2)}.`
      : null

    return {
      assetType: (isBuy ? 'COLLATERAL' : 'CONDITIONAL') as 'COLLATERAL' | 'CONDITIONAL',
      tokenId: input.tokenId,
      requiredAmount,
      balance: userBalance,
      maxAllowance: Number.MAX_SAFE_INTEGER,
      allowanceTargets: {},
      isBalanceSufficient,
      isAllowanceSufficient: true,
      reason,
    }
  }, [ userBalance ])

  const placeMarketOrder = useCallback(async (input: { tokenId: string; amount: number; side: 'BUY' | 'SELL'; price?: number; orderType?: string; marketQuestion?: string; marketSlug?: string }) => {
    if (!userAddress) {
      setExecutionError('Connect a wallet to place orders.')

      return null
    }

    setExecutionError(null)
    setLastExecutionMessage(null)
    setSubmittingOrder(true)

    try {
      const currentPrice = input.price || 0.5
      const response = await fetch('/api/predikts/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          tokenId: input.tokenId,
          side: input.side,
          amount: input.amount,
          price: currentPrice,
          orderType: 'MARKET',
          marketQuestion: input.marketQuestion,
          marketSlug: input.marketSlug,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Order failed.')
      }

      if (typeof data.newBalance === 'number') setUserBalance(data.newBalance)

      const statusMsg = data.status === 'matched'
        ? 'Order filled!'
        : data.status === 'delayed'
          ? 'Sell order posted to book — no buyers right now. It will fill when a buyer appears, or when the market resolves.'
          : `Order submitted (status: ${data.status || 'pending'}).`

      setLastExecutionMessage(statusMsg)
      analytics.trackEvent('predikt_polymarket_market_order_submitted', {
        token_id: input.tokenId,
        side: input.side,
        amount: input.amount,
        status: data.status,
      })

      await invalidateTradingQueries()

      return data
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Could not place the order.'

      setExecutionError(message)
      analytics.trackEvent('predikt_polymarket_market_order_failed', { error_message: message })

      return null
    }
    finally {
      setSubmittingOrder(false)
    }
  }, [ userAddress, analytics, invalidateTradingQueries ])

  const placeLimitOrder = useCallback(async (input: { tokenId: string; price: number; size: number; side: 'BUY' | 'SELL'; marketQuestion?: string; marketSlug?: string }) => {
    if (!userAddress) {
      setExecutionError('Connect a wallet to place orders.')

      return null
    }

    setExecutionError(null)
    setLastExecutionMessage(null)
    setSubmittingOrder(true)

    try {
      const response = await fetch('/api/predikts/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          tokenId: input.tokenId,
          side: input.side,
          // BUY: amount = USD (price × shares); SELL: amount = shares directly
          // Trade API computes proceeds = amount × price for SELL orders
          amount: input.side === 'SELL' ? input.size : input.price * input.size,
          price: input.price,
          size: input.size,
          orderType: 'LIMIT',
          marketQuestion: input.marketQuestion,
          marketSlug: input.marketSlug,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Order failed.')
      }

      if (typeof data.newBalance === 'number') setUserBalance(data.newBalance)

      setLastExecutionMessage(`Limit order submitted (status: ${data.status || 'pending'}).`)
      analytics.trackEvent('predikt_polymarket_limit_order_submitted', {
        token_id: input.tokenId,
        side: input.side,
        price: input.price,
        size: input.size,
        status: data.status,
      })

      await invalidateTradingQueries()

      return data
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Could not place the order.'

      setExecutionError(message)

      return null
    }
    finally {
      setSubmittingOrder(false)
    }
  }, [ userAddress, analytics, invalidateTradingQueries ])

  const getOpenOrders = useCallback(async (assetIds?: string[]) => {
    // Fetch open orders from Polymarket via the platform wallet's credentials
    try {
      const params = assetIds?.length ? `?tokenIds=${assetIds.join(',')}` : ''
      const r = await fetch(`/api/predikts/orders${params}`)
      const data = await r.json()

      return Array.isArray(data) ? data : []
    }
    catch {
      return []
    }
  }, [])

  const cancelOrder = useCallback(async (orderId: string) => {
    try {
      const r = await fetch(`/api/predikts/orders/${orderId}`, { method: 'DELETE' })

      return r.ok
    }
    catch {
      return false
    }
  }, [])

  const value: PolymarketTradingContextValue = {
    mode: 'custodial',
    isWalletConnected: Boolean(userAddress),
    isReadyForAuthentication: Boolean(userAddress),
    isOnSupportedChain: true, // platform wallet is always on Polygon
    isExecutionEnabled,
    hasCredentials: true, // platform wallet always has credentials
    isAuthenticating: false,
    isDeployingSafe: false,
    isSubmittingOrder,
    isRefreshingOrders,
    isCheckingReadiness: false,
    isFixingAllowance: false,
    isCancellingOrderId: null,
    authError: null,
    executionError,
    lastExecutionMessage,
    debugLog: [],
    statusMessage: '',
    userBalance,
    platformAddress,
    createOrDeriveApiKey,
    checkOrderReadiness,
    fixAllowance,
    placeLimitOrder,
    placeMarketOrder,
    getOpenOrders,
    cancelOrder,
  }

  return (
    <Context.Provider value={value}>
      {children}
    </Context.Provider>
  )
}

export const usePolymarketTrading = (): PolymarketTradingContextValue => {
  const ctx = useContext(Context)

  if (!ctx) {
    throw new Error('usePolymarketTrading must be used inside PolymarketTradingBoundary')
  }

  return ctx
}
