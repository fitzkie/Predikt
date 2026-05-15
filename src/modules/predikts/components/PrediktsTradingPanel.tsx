'use client'

import { useEffect, useMemo, useState } from 'react'
import { openModal } from '@locmod/modal'
import { polygon } from 'viem/chains'
import { useAnalytics } from 'providers/analytics'
import { useOptionalPrivy } from 'providers/auth'
import { parsePolymarketOutcomePrices, parsePolymarketOutcomes, parsePolymarketTokenIds, type PolymarketMarket, usePolymarketOpenOrders, usePolymarketOrderReadiness, usePolymarketTrading } from 'providers/polymarket'
import { useWallet } from 'wallet'

import { Button, buttonMessages } from 'components/inputs'


type Props = {
  market: PolymarketMarket
  initialOutcomeIndex?: number
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

const formatDateTime = (timestamp?: number) => {
  if (!timestamp) {
    return 'Unknown'
  }

  return new Date(timestamp).toLocaleString()
}

const PrediktsTradingPanel: React.FC<Props> = ({ market, initialOutcomeIndex = 0 }) => {
  const { account, chainId, isAAWallet } = useWallet()
  const { connectWallet, canLogin, ready } = useOptionalPrivy()
  const analytics = useAnalytics()
  const trading = usePolymarketTrading()
  const outcomes = parsePolymarketOutcomes(market)
  const prices = parsePolymarketOutcomePrices(market)
  const tokenIds = parsePolymarketTokenIds(market)
  const [ orderMode, setOrderMode ] = useState<'LIMIT' | 'MARKET'>('LIMIT')
  const [ side, setSide ] = useState<'BUY' | 'SELL'>('BUY')
  const [ selectedOutcomeIndex, setSelectedOutcomeIndex ] = useState(initialOutcomeIndex)
  const [ size, setSize ] = useState('25')
  const [ price, setPrice ] = useState(String(prices[0] || 0.5))
  const [ marketOrderType, setMarketOrderType ] = useState<'FOK' | 'FAK'>('FOK')
  const [ ticketError, setTicketError ] = useState<string | null>(null)
  const openOrdersQuery = usePolymarketOpenOrders(tokenIds)

  useEffect(() => {
    setSelectedOutcomeIndex(initialOutcomeIndex)
    setPrice(String(prices[initialOutcomeIndex] || prices[0] || 0.5))
  }, [ initialOutcomeIndex, market.id, prices ])

  const isTradeReady = trading.isExecutionEnabled && trading.isWalletConnected && trading.hasCredentials
  const selectedOutcome = outcomes[selectedOutcomeIndex] || 'Yes'
  const selectedTokenId = tokenIds[selectedOutcomeIndex]
  const balanceAssetLabel = side === 'BUY'
    ? 'USDC'
    : `${selectedOutcome} shares`
  const numericPrice = Number(price)
  const numericSize = Number(size)
  const readinessQuery = usePolymarketOrderReadiness({
    tokenId: selectedTokenId,
    side,
    orderMode,
    price: Number.isNaN(numericPrice) ? undefined : numericPrice,
    size: Number.isNaN(numericSize) ? undefined : numericSize,
    amount: Number.isNaN(numericSize) ? undefined : numericSize,
  })
  const estimatedNotional = useMemo(() => {
    const numericSize = Number(size || 0)
    const numericPrice = Number(price || 0)

    if (Number.isNaN(numericSize) || Number.isNaN(numericPrice)) {
      return '$0.00'
    }

    return formatCurrency(numericSize * numericPrice)
  }, [ price, size ])

  const handleEnableTrading = async () => {
    setTicketError(null)
    await trading.createOrDeriveApiKey()
    await openOrdersQuery.refetch()
  }

  const handleSubmitOrder = async () => {
    setTicketError(null)

    if (!trading.hasCredentials) {
      const nextCredentials = await trading.createOrDeriveApiKey()

      if (!nextCredentials) {
        setTicketError('Enable trading before placing a live order.')
        return
      }
    }

    if (!selectedTokenId) {
      setTicketError('This market outcome is missing a tradable token ID.')
      return
    }

    if (Number.isNaN(numericSize) || numericSize <= 0) {
      setTicketError('Size must be greater than zero.')
      return
    }

    if (readinessQuery.data?.reason) {
      setTicketError(readinessQuery.data.reason)
      return
    }

    if (orderMode === 'LIMIT') {
      if (Number.isNaN(numericPrice) || numericPrice <= 0 || numericPrice >= 1) {
        setTicketError('Price must be between 0 and 1 for a limit order.')
        return
      }

      await trading.placeLimitOrder({
        tokenId: selectedTokenId,
        price: numericPrice,
        size: numericSize,
        side,
      })
    }
    else {
      await trading.placeMarketOrder({
        tokenId: selectedTokenId,
        amount: numericSize,
        side,
        price: Number.isNaN(numericPrice) ? undefined : numericPrice,
        orderType: marketOrderType,
      })
    }

    await openOrdersQuery.refetch()
  }

  const handleFixAllowance = async () => {
    setTicketError(null)

    if (!selectedTokenId) {
      setTicketError('This market outcome is missing a tradable token ID.')
      return
    }

    const success = await trading.fixAllowance({
      tokenId: selectedTokenId,
      side,
      orderMode,
      price: Number.isNaN(numericPrice) ? undefined : numericPrice,
      size: Number.isNaN(numericSize) ? undefined : numericSize,
      amount: Number.isNaN(numericSize) ? undefined : numericSize,
    })

    if (success) {
      await readinessQuery.refetch()
    }
  }

  const handleFundWallet = () => {
    const requiredAmount = readinessQuery.data?.requiredAmount
    const fundingAsset = side === 'BUY' ? 'USDC.e' : `${selectedOutcome} shares`

    analytics.trackEvent('predikt_polymarket_funding_opened', {
      asset: fundingAsset,
      side,
      order_mode: orderMode,
      required_amount: requiredAmount,
      token_id: selectedTokenId,
    })

    openModal('PrediktsDepositModal')
  }

  const handleConnect = () => {
    if (canLogin && ready) {
      try {
        connectWallet()
        return
      }
      catch {}
    }

    openModal('ConnectModal')
  }

  const handleSwitchToPolygon = () => {
    openModal('SwitchNetworkModal', {
      chainId: polygon.id,
    })
  }

  const balance = readinessQuery.data?.balance ?? 0
  const quickAmounts = [ 0.1, 0.25, 0.5, 1 ]

  return (
    <div className="rounded-xl border border-white/10 bg-bg-l2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-brand-50/15 text-caption-12 font-semibold text-brand-50">
            {selectedOutcome.slice(0, 1)}
          </div>
          <span className="text-caption-13 font-semibold text-grey-90">{selectedOutcome}</span>
        </div>
        <select
          className="rounded-md border border-white/10 bg-transparent px-2 py-1 text-caption-12 text-grey-60 outline-none"
          value={orderMode}
          onChange={(e) => setOrderMode(e.target.value as 'LIMIT' | 'MARKET')}
        >
          <option value="LIMIT">Limit</option>
          <option value="MARKET">Market</option>
        </select>
      </div>

      <div className="p-5">
        {/* Market question */}
        <p className="text-caption-13 leading-5 text-grey-60">{market.question}</p>

        {/* Buy / Sell tabs */}
        <div className="mt-4 flex gap-1 border-b border-white/10">
          <button
            className={`pb-2 pr-4 text-caption-13 font-semibold transition ${side === 'BUY' ? 'border-b-2 border-brand-50 text-grey-90' : 'text-grey-50'}`}
            onClick={() => setSide('BUY')}
            type="button"
          >
            Buy
          </button>
          <button
            className={`pb-2 pr-4 text-caption-13 font-semibold transition ${side === 'SELL' ? 'border-b-2 border-brand-50 text-grey-90' : 'text-grey-50'}`}
            onClick={() => setSide('SELL')}
            type="button"
          >
            Sell
          </button>
        </div>

        {/* Outcome selector buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {outcomes.map((outcome, index) => {
            const outcomePrice = prices[index]
            const cents = typeof outcomePrice === 'number' ? `${Math.round(outcomePrice * 1000) / 10}¢` : '--'
            const isYes = index === 0
            const isSelected = selectedOutcomeIndex === index
            return (
              <button
                key={`${market.id}-outcome-${index}`}
                className={`rounded-xl px-3 py-3 text-caption-13 font-semibold transition ${isSelected ? 'ring-2' : 'opacity-70 hover:opacity-90'}`}
                onClick={() => {
                  setSelectedOutcomeIndex(index)
                  setPrice(String(prices[index] || price))
                }}
                style={
                  isYes
                    ? { backgroundColor: '#234f31', color: '#7ef0a5', ...(isSelected ? { outline: 'none', boxShadow: '0 0 0 2px #7ef0a5' } : {}) }
                    : { backgroundColor: '#4c2229', color: '#ff6f7c', ...(isSelected ? { outline: 'none', boxShadow: '0 0 0 2px #ff6f7c' } : {}) }
                }
                type="button"
              >
                {outcome} {cents}
              </button>
            )
          })}
        </div>

        {/* Amount input */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-caption-12 text-grey-60">
            <span>Amount</span>
            <span>Min. $1.00</span>
          </div>
          <div className="mt-2 flex items-center rounded-xl border border-white/10 bg-bg-l3 px-3 py-3">
            <span className="mr-2 text-caption-13 text-grey-60">$</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-caption-13 text-grey-90 outline-none"
              min="0"
              placeholder="0"
              type="number"
              value={size}
              onChange={(e) => setSize(e.target.value)}
            />
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {quickAmounts.map((pct) => {
              const label = pct === 1 ? 'Max' : `${pct * 100}%`
              const amount = balance > 0 ? (balance * pct).toFixed(2) : null
              return (
                <button
                  key={label}
                  className="rounded-lg border border-white/10 py-1.5 text-caption-12 font-semibold text-grey-60 transition hover:border-white/20 hover:text-grey-90 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={balance <= 0}
                  onClick={() => amount && setSize(amount)}
                  type="button"
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Limit price (shown only in limit mode) */}
        {
          orderMode === 'LIMIT' ? (
            <div className="mt-3">
              <div className="text-caption-12 text-grey-60">Price</div>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-bg-l3 px-3 py-3 text-caption-13 text-grey-90 outline-none"
                placeholder="0.57"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          ) : null
        }

        {/* Estimated notional */}
        <div className="mt-4 flex items-center justify-between text-caption-12 text-grey-60">
          <span>Estimated total</span>
          <span className="font-semibold text-grey-90">{estimatedNotional}</span>
        </div>

        {/* Errors / messages */}
        {(trading.authError || trading.executionError || ticketError) ? (
          <div className="mt-3 rounded-lg border border-risk-red/30 bg-risk-red/10 px-3 py-3 text-caption-12 text-risk-red">
            {trading.authError || trading.executionError || ticketError}
          </div>
        ) : null}
        {trading.lastExecutionMessage ? (
          <div className="mt-3 rounded-lg border border-success-green/20 bg-success-green/10 px-3 py-3 text-caption-12 text-success-green">
            {trading.lastExecutionMessage}
          </div>
        ) : null}
        {readinessQuery.data?.reason ? (
          <div className="mt-3 rounded-lg border border-risk-red/30 bg-risk-red/10 px-3 py-3 text-caption-12 text-risk-red">
            <div>{readinessQuery.data.reason}</div>
            {!readinessQuery.data.isBalanceSufficient ? (
              <div className="mt-1 text-caption-12 text-risk-red/80">
                {`You have ${formatCurrency(readinessQuery.data.balance)} but need ${formatCurrency(readinessQuery.data.requiredAmount)}.`}
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {!readinessQuery.data.isAllowanceSufficient ? (
                <button
                  className="rounded-md border border-brand-50/30 bg-brand-50/10 px-3 py-1.5 text-caption-12 font-semibold text-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={trading.isFixingAllowance}
                  onClick={() => { void handleFixAllowance() }}
                  type="button"
                >
                  {trading.isFixingAllowance ? 'Updating...' : 'Fix allowance'}
                </button>
              ) : null}
              {!readinessQuery.data.isBalanceSufficient ? (
                <button
                  className="rounded-md border border-brand-50/30 bg-brand-50/10 px-3 py-1.5 text-caption-12 font-semibold text-brand-50"
                  onClick={handleFundWallet}
                  type="button"
                >
                  Deposit USDC
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Primary action button */}
        <div className="mt-5 space-y-2">
          {!account ? (
            <Button className="w-full" size={40} title={buttonMessages.connectWallet} onClick={handleConnect} />
          ) : !trading.isOnSupportedChain ? (
            <button
              className="w-full rounded-xl bg-brand-50 px-4 py-3 text-caption-13 font-semibold text-black"
              onClick={handleSwitchToPolygon}
              type="button"
            >
              Switch to Polygon
            </button>
          ) : !trading.hasCredentials ? (
            <button
              className="w-full rounded-xl bg-brand-50 px-4 py-3 text-caption-13 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
              disabled={trading.isAuthenticating || trading.isDeployingSafe || !trading.isReadyForAuthentication}
              onClick={() => { void handleEnableTrading() }}
              type="button"
            >
              {trading.isDeployingSafe
                ? 'Setting up Smart Wallet...'
                : trading.isAuthenticating
                  ? 'Connecting to Polymarket...'
                  : 'Sign to Enable Trading'}
            </button>
          ) : (
            <button
              className="w-full rounded-xl px-4 py-3 text-caption-13 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isTradeReady || trading.isSubmittingOrder || Boolean(readinessQuery.data?.reason) || readinessQuery.isFetching || trading.isCheckingReadiness}
              onClick={() => { void handleSubmitOrder() }}
              style={{ backgroundColor: selectedOutcomeIndex === 0 ? '#7ef0a5' : '#ff6f7c' }}
              type="button"
            >
              {trading.isSubmittingOrder ? 'Submitting...' : `${side === 'BUY' ? 'Buy' : 'Sell'} ${selectedOutcome}`}
            </button>
          )}
        </div>

        {/* Open orders */}
        {(openOrdersQuery.data?.length || openOrdersQuery.isLoading) ? (
          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between text-caption-12 text-grey-60">
              <span className="uppercase tracking-[0.14em]">Open orders</span>
              <button
                className="text-grey-50 hover:text-grey-90 disabled:opacity-50"
                disabled={openOrdersQuery.isFetching || !trading.hasCredentials}
                onClick={() => { void openOrdersQuery.refetch() }}
                type="button"
              >
                {openOrdersQuery.isFetching ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {openOrdersQuery.isLoading ? (
                <div className="text-caption-12 text-grey-60">Loading...</div>
              ) : openOrdersQuery.data?.map((order) => {
                const remainingSize = Math.max(Number(order.original_size) - Number(order.size_matched), 0)
                return (
                  <div key={order.id} className="rounded-lg border border-white/10 bg-bg-l3 p-3">
                    <div className="flex items-center justify-between text-caption-12">
                      <span className="font-semibold text-grey-90">{order.side} {order.outcome} @ {order.price}</span>
                      <span className="text-grey-60">{remainingSize.toFixed(2)} left</span>
                    </div>
                    <button
                      className="mt-2 text-caption-12 font-semibold text-risk-red disabled:opacity-50"
                      disabled={trading.isCancellingOrderId === order.id}
                      onClick={() => { void trading.cancelOrder(order.id) }}
                      type="button"
                    >
                      {trading.isCancellingOrderId === order.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default PrediktsTradingPanel
