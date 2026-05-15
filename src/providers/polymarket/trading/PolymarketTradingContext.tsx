'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AssetType, OrderType, Side } from '@polymarket/clob-client-v2'
import { useWalletClient } from 'wagmi'
import { useWallet } from 'wallet'
import { polygon } from 'viem/chains'
import { type WalletClient } from 'viem'
import { useAnalytics } from 'providers/analytics'
import { type PolymarketApiCredentials, type PolymarketBalanceAllowance, type PolymarketOpenOrder, type PolymarketOrderResponse } from 'providers/polymarket/client'

import usePolymarketApiCredentials from './usePolymarketApiCredentials'
import { createPolymarketAuthClient, createPolymarketExecutionClient } from './client'


type PolymarketLimitOrderInput = {
  tokenId: string
  price: number
  size: number
  side: 'BUY' | 'SELL'
  expiration?: number
}

type PolymarketMarketOrderInput = {
  tokenId: string
  amount: number
  side: 'BUY' | 'SELL'
  price?: number
  orderType?: 'FOK' | 'FAK'
}

type PolymarketOrderReadinessInput = {
  tokenId: string
  side: 'BUY' | 'SELL'
  orderMode: 'LIMIT' | 'MARKET'
  price?: number
  size?: number
  amount?: number
}

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
  mode: 'live'
  isWalletConnected: boolean
  isReadyForAuthentication: boolean
  isOnSupportedChain: boolean
  isExecutionEnabled: boolean
  hasCredentials: boolean
  credentials: PolymarketApiCredentials | null
  isAuthenticating: boolean
  isSubmittingOrder: boolean
  isRefreshingOrders: boolean
  isCheckingReadiness: boolean
  isFixingAllowance: boolean
  isCancellingOrderId: string | null
  authError: string | null
  executionError: string | null
  lastExecutionMessage: string | null
  statusMessage: string
  saveCredentials: ReturnType<typeof usePolymarketApiCredentials>['saveCredentials']
  clearCredentials: ReturnType<typeof usePolymarketApiCredentials>['clearCredentials']
  createOrDeriveApiKey: (nonce?: number) => Promise<PolymarketApiCredentials | null>
  checkOrderReadiness: (input: PolymarketOrderReadinessInput) => Promise<PolymarketOrderReadiness | null>
  fixAllowance: (input: PolymarketOrderReadinessInput) => Promise<boolean>
  placeLimitOrder: (input: PolymarketLimitOrderInput) => Promise<PolymarketOrderResponse | null>
  placeMarketOrder: (input: PolymarketMarketOrderInput) => Promise<PolymarketOrderResponse | null>
  getOpenOrders: (assetIds?: string[]) => Promise<PolymarketOpenOrder[]>
  cancelOrder: (orderId: string) => Promise<boolean>
}

const Context = createContext<PolymarketTradingContextValue | null>(null)

export const PolymarketTradingBoundary: React.CFC = ({ children }) => {
  const { account, isAAWallet, aaWalletClient, isReady, chainId } = useWallet()
  const walletClient = useWalletClient()
  const queryClient = useQueryClient()
  const analytics = useAnalytics()
  const { credentials, hasCredentials, saveCredentials, clearCredentials } = usePolymarketApiCredentials()
  const [ isAuthenticating, setAuthenticating ] = useState(false)
  const [ isSubmittingOrder, setSubmittingOrder ] = useState(false)
  const [ isRefreshingOrders, setRefreshingOrders ] = useState(false)
  const [ isCheckingReadiness, setCheckingReadiness ] = useState(false)
  const [ isFixingAllowance, setFixingAllowance ] = useState(false)
  const [ isCancellingOrderId, setCancellingOrderId ] = useState<string | null>(null)
  const [ authError, setAuthError ] = useState<string | null>(null)
  const [ executionError, setExecutionError ] = useState<string | null>(null)
  const [ lastExecutionMessage, setLastExecutionMessage ] = useState<string | null>(null)

  const isOnSupportedChain = chainId === polygon.id
  const isExecutionEnabled = Boolean(process.env.NEXT_PUBLIC_POLYMARKET_TRADING_ENABLED === 'true')

  // Track which account we last attempted auto-auth for so we don't loop on failure
  const autoAuthAccountRef = useRef<string | null>(null)

  // Clear stale credentials when the connected wallet address changes
  useEffect(() => {
    if (account && credentials?.walletAddress && credentials.walletAddress.toLowerCase() !== account.toLowerCase()) {
      clearCredentials()
    }
  }, [ account, credentials?.walletAddress, clearCredentials ])

  // Auto-derive Polymarket API credentials as soon as the wallet is ready —
  // this eliminates the manual "Enable Trading" step after connecting.
  useEffect(() => {
    if (
      account &&
      isReady &&
      isOnSupportedChain &&
      isExecutionEnabled &&
      !hasCredentials &&
      !isAuthenticating &&
      autoAuthAccountRef.current !== account
    ) {
      autoAuthAccountRef.current = account
      void createOrDeriveApiKey()
    }
  // createOrDeriveApiKey is stable (useCallback) but adding it would cause a loop;
  // the ref guard prevents repeated attempts on the same account.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ account, isReady, isOnSupportedChain, isExecutionEnabled, hasCredentials, isAuthenticating ])

  const getActiveSigner = useCallback(() => {
    const signer = (isAAWallet ? aaWalletClient : walletClient.data) as WalletClient | undefined

    if (!signer) {
      throw new Error(isAAWallet
        ? 'Privy smart-wallet signer is not ready yet.'
        : 'Wallet signer is not ready for market execution.')
    }

    return signer
  }, [ aaWalletClient, isAAWallet, walletClient.data ])

  const invalidateTradingQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [ 'polymarket', 'trading', 'open-orders' ] }),
      queryClient.invalidateQueries({ queryKey: [ 'polymarket', 'trading', 'readiness' ] }),
      queryClient.invalidateQueries({ queryKey: [ 'polymarket', 'positions' ] }),
      queryClient.invalidateQueries({ queryKey: [ 'polymarket', 'activity' ] }),
    ])
  }, [ queryClient ])

  const createOrDeriveApiKey = useCallback(async (nonce = 0) => {
    if (!account) {
      setAuthError('Connect a wallet before enabling market trading.')
      return null
    }

    if (!isOnSupportedChain) {
      setAuthError('Switch the wallet to Polygon before enabling market trading.')
      return null
    }

    setAuthenticating(true)
    setAuthError(null)

    try {
      const client = createPolymarketAuthClient({
        signer: getActiveSigner(),
        isAAWallet,
        funderAddress: account,
      })
      const nextCredentials = await client.createOrDeriveApiKey(nonce)

      const normalizedCredentials = {
        apiKey: nextCredentials.key,
        passphrase: nextCredentials.passphrase,
        secret: nextCredentials.secret,
        walletAddress: account,
        createdAt: new Date().toISOString(),
      }

      saveCredentials(normalizedCredentials)
      setAuthenticating(false)
      setLastExecutionMessage('Trading is enabled for authenticated order placement.')
      analytics.trackEvent('predikt_polymarket_auth_success', {
        wallet_type: isAAWallet ? 'smart_wallet' : 'eoa',
      })

      return normalizedCredentials
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Could not enable market trading.'

      setAuthError(message)
      setAuthenticating(false)
      analytics.trackEvent('predikt_polymarket_auth_failed', {
        wallet_type: isAAWallet ? 'smart_wallet' : 'eoa',
        error_message: message,
      })

      return null
    }
  }, [ account, analytics, getActiveSigner, isAAWallet, isOnSupportedChain, saveCredentials ])

  const getExecutionClient = useCallback(() => {
    if (!account) {
      throw new Error('Connect a wallet before trading on this market.')
    }

    if (!isOnSupportedChain) {
      throw new Error('Switch the wallet to Polygon before trading on this market.')
    }

    if (!isExecutionEnabled) {
      throw new Error('Polymarket execution is disabled for this deployment.')
    }

    return createPolymarketExecutionClient({
      signer: getActiveSigner(),
      isAAWallet,
      funderAddress: account,
      credentials,
    })
  }, [ account, credentials, getActiveSigner, isAAWallet, isExecutionEnabled, isOnSupportedChain ])

  const toNumeric = (value?: string) => {
    const parsed = Number(value || 0)

    return Number.isNaN(parsed) ? 0 : parsed
  }

  const getMaxAllowance = (allowances: Record<string, string>) => {
    return Object.values(allowances).reduce((max, value) => Math.max(max, toNumeric(value)), 0)
  }

  const buildReadinessResult = ({
    assetType,
    tokenId,
    requiredAmount,
    payload,
  }: {
    assetType: 'COLLATERAL' | 'CONDITIONAL'
    tokenId?: string
    requiredAmount: number
    payload: PolymarketBalanceAllowance
  }): PolymarketOrderReadiness => {
    const balance = toNumeric(payload.balance)
    const maxAllowance = getMaxAllowance(payload.allowances)
    const isBalanceSufficient = balance >= requiredAmount
    const isAllowanceSufficient = maxAllowance >= requiredAmount

    let reason: string | null = null

    if (!isBalanceSufficient && !isAllowanceSufficient) {
      reason = `Insufficient ${assetType === 'COLLATERAL' ? 'USDC balance and allowance' : 'share balance and allowance'} for this order.`
    }
    else if (!isBalanceSufficient) {
      reason = `Insufficient ${assetType === 'COLLATERAL' ? 'USDC balance' : 'share balance'} for this order.`
    }
    else if (!isAllowanceSufficient) {
      reason = `Allowance is below the amount required for this ${assetType === 'COLLATERAL' ? 'USDC' : 'share'} order.`
    }

    return {
      assetType,
      tokenId,
      requiredAmount,
      balance,
      maxAllowance,
      allowanceTargets: payload.allowances,
      isBalanceSufficient,
      isAllowanceSufficient,
      reason,
    }
  }

  const checkOrderReadiness = useCallback(async (input: PolymarketOrderReadinessInput) => {
    if (!hasCredentials || !account || !isExecutionEnabled) {
      return null
    }

    setExecutionError(null)
    setCheckingReadiness(true)

    try {
      const client = getExecutionClient()
      const isBuy = input.side === 'BUY'
      const requiredAmount = isBuy
        ? (input.orderMode === 'LIMIT'
          ? (input.price || 0) * (input.size || 0)
          : (input.amount || 0))
        : (input.orderMode === 'LIMIT'
          ? (input.size || 0)
          : (input.amount || 0))

      const payload = await client.getBalanceAllowance({
        asset_type: isBuy ? AssetType.COLLATERAL : AssetType.CONDITIONAL,
        token_id: isBuy ? undefined : input.tokenId,
      })
      const result = buildReadinessResult({
        assetType: isBuy ? 'COLLATERAL' : 'CONDITIONAL',
        tokenId: isBuy ? undefined : input.tokenId,
        requiredAmount,
        payload: payload as PolymarketBalanceAllowance,
      })

      setCheckingReadiness(false)

      return result
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Could not check market balance and allowance.'

      setExecutionError(message)
      setCheckingReadiness(false)

      return null
    }
  }, [ account, getExecutionClient, hasCredentials, isExecutionEnabled ])

  const fixAllowance = useCallback(async (input: PolymarketOrderReadinessInput) => {
    if (!hasCredentials || !account || !isExecutionEnabled) {
      return false
    }

    const isBuy = input.side === 'BUY'

    setExecutionError(null)
    setLastExecutionMessage(null)
    setFixingAllowance(true)

    try {
      const client = getExecutionClient()

      await client.updateBalanceAllowance({
        asset_type: isBuy ? AssetType.COLLATERAL : AssetType.CONDITIONAL,
        token_id: isBuy ? undefined : input.tokenId,
      })

      await invalidateTradingQueries()
      setLastExecutionMessage(`Allowance update submitted for ${isBuy ? 'USDC collateral' : 'conditional shares'}. Refreshing readiness.`)
      setFixingAllowance(false)
      analytics.trackEvent('predikt_polymarket_allowance_update_submitted', {
        asset_type: isBuy ? 'COLLATERAL' : 'CONDITIONAL',
        token_id: input.tokenId,
        side: input.side,
        order_mode: input.orderMode,
      })

      return true
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update allowance for this market.'

      setExecutionError(message)
      setFixingAllowance(false)
      analytics.trackEvent('predikt_polymarket_allowance_update_failed', {
        asset_type: isBuy ? 'COLLATERAL' : 'CONDITIONAL',
        token_id: input.tokenId,
        side: input.side,
        order_mode: input.orderMode,
        error_message: message,
      })

      return false
    }
  }, [ account, analytics, getExecutionClient, hasCredentials, invalidateTradingQueries, isExecutionEnabled ])

  const placeLimitOrder = useCallback(async (input: PolymarketLimitOrderInput) => {
    setExecutionError(null)
    setLastExecutionMessage(null)
    setSubmittingOrder(true)

    try {
      const readiness = await checkOrderReadiness({
        tokenId: input.tokenId,
        side: input.side,
        orderMode: 'LIMIT',
        price: input.price,
        size: input.size,
      })

      if (readiness?.reason) {
        throw new Error(readiness.reason)
      }

      const client = getExecutionClient()
      const response = await client.createAndPostOrder({
        tokenID: input.tokenId,
        price: input.price,
        size: input.size,
        side: input.side === 'BUY' ? Side.BUY : Side.SELL,
        expiration: input.expiration,
      }, undefined, OrderType.GTC)

      await invalidateTradingQueries()
      setLastExecutionMessage(`Limit order submitted with status ${response.status}.`)
      setSubmittingOrder(false)
      analytics.trackEvent('predikt_polymarket_limit_order_submitted', {
        token_id: input.tokenId,
        side: input.side,
        price: input.price,
        size: input.size,
        status: response.status,
        order_id: response.orderID,
      })

      return response as PolymarketOrderResponse
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Could not place the order.'

      setExecutionError(message)
      setSubmittingOrder(false)
      analytics.trackEvent('predikt_polymarket_limit_order_failed', {
        token_id: input.tokenId,
        side: input.side,
        price: input.price,
        size: input.size,
        error_message: message,
      })

      return null
    }
  }, [ analytics, checkOrderReadiness, getExecutionClient, invalidateTradingQueries ])

  const placeMarketOrder = useCallback(async (input: PolymarketMarketOrderInput) => {
    setExecutionError(null)
    setLastExecutionMessage(null)
    setSubmittingOrder(true)

    try {
      const readiness = await checkOrderReadiness({
        tokenId: input.tokenId,
        side: input.side,
        orderMode: 'MARKET',
        price: input.price,
        amount: input.amount,
      })

      if (readiness?.reason) {
        throw new Error(readiness.reason)
      }

      const client = getExecutionClient()
      const response = await client.createAndPostMarketOrder({
        tokenID: input.tokenId,
        amount: input.amount,
        price: input.price,
        side: input.side === 'BUY' ? Side.BUY : Side.SELL,
        orderType: input.orderType === 'FAK' ? OrderType.FAK : OrderType.FOK,
      }, undefined, input.orderType === 'FAK' ? OrderType.FAK : OrderType.FOK)

      await invalidateTradingQueries()
      setLastExecutionMessage(`Market order submitted with status ${response.status}.`)
      setSubmittingOrder(false)
      analytics.trackEvent('predikt_polymarket_market_order_submitted', {
        token_id: input.tokenId,
        side: input.side,
        price: input.price,
        amount: input.amount,
        order_type: input.orderType || 'FOK',
        status: response.status,
        order_id: response.orderID,
      })

      return response as PolymarketOrderResponse
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Could not place the market order.'

      setExecutionError(message)
      setSubmittingOrder(false)
      analytics.trackEvent('predikt_polymarket_market_order_failed', {
        token_id: input.tokenId,
        side: input.side,
        price: input.price,
        amount: input.amount,
        order_type: input.orderType || 'FOK',
        error_message: message,
      })

      return null
    }
  }, [ analytics, checkOrderReadiness, getExecutionClient, invalidateTradingQueries ])

  const getOpenOrders = useCallback(async (assetIds?: string[]) => {
    if (!hasCredentials || !account || !isExecutionEnabled) {
      return []
    }

    setExecutionError(null)
    setRefreshingOrders(true)

    try {
      const client = getExecutionClient()
      const results = assetIds?.length
        ? await Promise.all(assetIds.map((assetId) => client.getOpenOrders({ asset_id: assetId }, true)))
        : [ await client.getOpenOrders(undefined, true) ]

      setRefreshingOrders(false)

      return results.flat() as PolymarketOpenOrder[]
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load open orders.'

      setExecutionError(message)
      setRefreshingOrders(false)

      return []
    }
  }, [ account, getExecutionClient, hasCredentials, isExecutionEnabled ])

  const cancelOrder = useCallback(async (orderId: string) => {
    setExecutionError(null)
    setLastExecutionMessage(null)
    setCancellingOrderId(orderId)

    try {
      const client = getExecutionClient()

      await client.cancelOrder({ orderID: orderId })
      await invalidateTradingQueries()
      setLastExecutionMessage('Order cancel request submitted.')
      setCancellingOrderId(null)
      analytics.trackEvent('predikt_polymarket_order_cancelled', {
        order_id: orderId,
      })

      return true
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Could not cancel the order.'

      setExecutionError(message)
      setCancellingOrderId(null)
      analytics.trackEvent('predikt_polymarket_order_cancel_failed', {
        order_id: orderId,
        error_message: message,
      })

      return false
    }
  }, [ analytics, getExecutionClient, invalidateTradingQueries ])

  const value = useMemo<PolymarketTradingContextValue>(() => {
    return {
      mode: 'live',
      isWalletConnected: Boolean(account),
      isReadyForAuthentication: Boolean(account && isReady),
      isOnSupportedChain,
      isExecutionEnabled,
      credentials,
      hasCredentials,
      isAuthenticating,
      isSubmittingOrder,
      isRefreshingOrders,
      isCheckingReadiness,
      isFixingAllowance,
      isCancellingOrderId,
      authError,
      executionError,
      lastExecutionMessage,
      statusMessage: isExecutionEnabled
        ? (hasCredentials
          ? 'Trading boundary enabled. Signed CLOB order placement and cancellation are live for authenticated wallets.'
          : 'Trading is available. Enable this wallet before submitting live orders.')
        : 'Trading boundary is wired, but execution is disabled until NEXT_PUBLIC_POLYMARKET_TRADING_ENABLED is set to true.',
      saveCredentials,
      clearCredentials,
      createOrDeriveApiKey,
      checkOrderReadiness,
      fixAllowance,
      placeLimitOrder,
      placeMarketOrder,
      getOpenOrders,
      cancelOrder,
    }
  }, [ account, authError, cancelOrder, checkOrderReadiness, clearCredentials, createOrDeriveApiKey, credentials, executionError, fixAllowance, getOpenOrders, hasCredentials, isAuthenticating, isCancellingOrderId, isCheckingReadiness, isExecutionEnabled, isFixingAllowance, isOnSupportedChain, isReady, isRefreshingOrders, isSubmittingOrder, lastExecutionMessage, placeLimitOrder, placeMarketOrder, saveCredentials ])

  return (
    <Context.Provider value={value}>
      {children}
    </Context.Provider>
  )
}

export const usePolymarketTrading = () => {
  const value = useContext(Context)

  if (!value) {
    throw new Error('usePolymarketTrading must be used within PolymarketTradingBoundary')
  }

  return value
}
