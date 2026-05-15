'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AssetType, OrderType, Side } from '@polymarket/clob-client-v2'
import { useWalletClient, usePublicClient } from 'wagmi'
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
  isDeployingSafe: boolean
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
  const { account, chainId, isAAWallet, aaWalletClient } = useWallet()
  const walletClient = useWalletClient()
  const publicClient = usePublicClient({ chainId: polygon.id })
  const queryClient = useQueryClient()
  const analytics = useAnalytics()
  const { credentials, hasCredentials, saveCredentials, clearCredentials } = usePolymarketApiCredentials()
  const [ isAuthenticating, setAuthenticating ] = useState(false)
  const [ isDeployingSafe, setDeployingSafe ] = useState(false)
  const [ isSubmittingOrder, setSubmittingOrder ] = useState(false)
  const [ isRefreshingOrders, setRefreshingOrders ] = useState(false)
  const [ isCheckingReadiness, setCheckingReadiness ] = useState(false)
  const [ isFixingAllowance, setFixingAllowance ] = useState(false)
  const [ isCancellingOrderId, setCancellingOrderId ] = useState<string | null>(null)
  const [ authError, setAuthError ] = useState<string | null>(null)
  const [ executionError, setExecutionError ] = useState<string | null>(null)
  const [ lastExecutionMessage, setLastExecutionMessage ] = useState<string | null>(null)

  // For AA (Privy Gnosis Safe) users, use the Safe address as the Polymarket account
  // so sports betting and Predikts share one unified wallet address.
  // For non-AA users (MetaMask/WalletConnect), use the EOA directly.
  const polymarketAddress = isAAWallet && account
    ? account.toLowerCase()
    : walletClient.data?.account?.address?.toLowerCase()

  const isOnSupportedChain = chainId === polygon.id
  const isExecutionEnabled = process.env.NEXT_PUBLIC_POLYMARKET_TRADING_ENABLED !== 'false'
  const isReadyForAuthentication = Boolean(polymarketAddress) && (!isAAWallet || Boolean(aaWalletClient))

  // Clear stale credentials when the wallet address changes
  useEffect(() => {
    if (polymarketAddress && credentials?.walletAddress &&
        credentials.walletAddress.toLowerCase() !== polymarketAddress) {
      clearCredentials()
    }
  }, [ polymarketAddress, credentials?.walletAddress, clearCredentials ])

  // getActiveSigner always returns the EOA wallet client.
  // For POLY_GNOSIS_SAFE the EOA signs, with the Safe as the funder/maker.
  const getActiveSigner = useCallback(() => {
    const signer = walletClient.data as WalletClient | undefined

    if (!signer) {
      throw new Error('Wallet signer is not ready for market execution.')
    }

    return signer
  }, [ walletClient.data ])

  // Ensures the Privy Gnosis Safe is deployed on Polygon before trading.
  // POLY_GNOSIS_SAFE requires an on-chain Safe so Polymarket can read its owners.
  // If the Safe is already deployed this is a no-op (single getCode call).
  const ensureSafeDeployed = useCallback(async () => {
    if (!isAAWallet || !account || !aaWalletClient || !publicClient) {
      return
    }

    const code = await publicClient.getCode({ address: account as `0x${string}` })

    if (code && code !== '0x') {
      return
    }

    setDeployingSafe(true)

    try {
      // Sending a zero-value UserOp through the Safe triggers ERC-4337 deployment.
      // The Privy paymaster covers gas so the user pays nothing.
      await aaWalletClient.sendTransaction({
        to: account as `0x${string}`,
        value: 0n,
        data: '0x',
      })
    }
    finally {
      setDeployingSafe(false)
    }
  }, [ isAAWallet, account, aaWalletClient, publicClient ])

  const invalidateTradingQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [ 'polymarket', 'trading', 'open-orders' ] }),
      queryClient.invalidateQueries({ queryKey: [ 'polymarket', 'trading', 'readiness' ] }),
      queryClient.invalidateQueries({ queryKey: [ 'polymarket', 'positions' ] }),
      queryClient.invalidateQueries({ queryKey: [ 'polymarket', 'activity' ] }),
    ])
  }, [ queryClient ])

  const createOrDeriveApiKey = useCallback(async (nonce = 0) => {
    if (!polymarketAddress) {
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
      // For AA users, ensure the Gnosis Safe is deployed before attempting auth.
      // POLY_GNOSIS_SAFE requires the Safe to exist on-chain for owner verification.
      await ensureSafeDeployed()

      const client = createPolymarketAuthClient({
        signer: getActiveSigner(),
        isAAWallet,
        funderAddress: isAAWallet ? account : undefined,
      })

      // With throwOnError:true, createApiKey throws immediately on error rather
      // than falling through to deriveApiKey. If the address already has a key
      // on Polymarket's side from a previous attempt, createApiKey returns an
      // error but deriveApiKey would succeed — so we try that explicitly.
      let rawCredentials
      try {
        rawCredentials = await client.createOrDeriveApiKey(nonce)
      }
      catch {
        rawCredentials = await client.deriveApiKey(nonce)
      }

      const normalizedCredentials = {
        apiKey: rawCredentials.key,
        passphrase: rawCredentials.passphrase,
        secret: rawCredentials.secret,
        walletAddress: polymarketAddress,
        createdAt: new Date().toISOString(),
      }

      saveCredentials(normalizedCredentials)
      setAuthenticating(false)
      setLastExecutionMessage('Trading is enabled for authenticated order placement.')
      analytics.trackEvent('predikt_polymarket_auth_success', { wallet_type: isAAWallet ? 'safe' : 'eoa' })

      return normalizedCredentials
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Could not enable market trading.'

      setAuthError(message)
      setAuthenticating(false)
      setDeployingSafe(false)
      analytics.trackEvent('predikt_polymarket_auth_failed', { error_message: message })

      return null
    }
  }, [ polymarketAddress, account, isAAWallet, analytics, ensureSafeDeployed, getActiveSigner, isOnSupportedChain, saveCredentials ])

  const getExecutionClient = useCallback(() => {
    if (!polymarketAddress) {
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
      credentials,
      isAAWallet,
      funderAddress: isAAWallet ? account : undefined,
    })
  }, [ polymarketAddress, account, isAAWallet, credentials, getActiveSigner, isExecutionEnabled, isOnSupportedChain ])

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
    const deployingMessage = isDeployingSafe ? 'Setting up your Smart Wallet on Polygon...' : null
    const statusMessage = deployingMessage
      ?? (isExecutionEnabled
        ? (hasCredentials
          ? 'Trading boundary enabled. Signed CLOB order placement and cancellation are live for authenticated wallets.'
          : 'Trading is available. Enable this wallet before submitting live orders.')
        : 'Trading boundary is wired, but execution is disabled until NEXT_PUBLIC_POLYMARKET_TRADING_ENABLED is set to true.')

    return {
      mode: 'live',
      isWalletConnected: Boolean(polymarketAddress),
      isReadyForAuthentication,
      isOnSupportedChain,
      isExecutionEnabled,
      credentials,
      hasCredentials,
      isAuthenticating,
      isDeployingSafe,
      isSubmittingOrder,
      isRefreshingOrders,
      isCheckingReadiness,
      isFixingAllowance,
      isCancellingOrderId,
      authError,
      executionError,
      lastExecutionMessage,
      statusMessage,
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
  }, [ polymarketAddress, isReadyForAuthentication, authError, cancelOrder, checkOrderReadiness, clearCredentials, createOrDeriveApiKey, credentials, executionError, fixAllowance, getOpenOrders, hasCredentials, isAuthenticating, isDeployingSafe, isCancellingOrderId, isCheckingReadiness, isExecutionEnabled, isFixingAllowance, isOnSupportedChain, isRefreshingOrders, isSubmittingOrder, lastExecutionMessage, placeLimitOrder, placeMarketOrder, saveCredentials ])

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
