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

const fmt = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const fmtCents = (value: number) =>
  `${Math.round(value * 100)}¢`

const PrediktsTradingPanel: React.FC<Props> = ({ market, initialOutcomeIndex = 0 }) => {
  const { account, chainId } = useWallet()
  const { connectWallet, canLogin, ready } = useOptionalPrivy()
  const analytics = useAnalytics()
  const trading = usePolymarketTrading()
  const outcomes = parsePolymarketOutcomes(market)
  const prices = parsePolymarketOutcomePrices(market)
  const tokenIds = parsePolymarketTokenIds(market)
  const [ orderMode, setOrderMode ] = useState<'LIMIT' | 'MARKET'>('MARKET')
  const [ side, setSide ] = useState<'BUY' | 'SELL'>('BUY')
  const [ selectedOutcomeIndex, setSelectedOutcomeIndex ] = useState(initialOutcomeIndex)
  // amount is always in USDC (dollars to wager)
  const [ amount, setAmount ] = useState('10')
  const [ limitPrice, setLimitPrice ] = useState(String(prices[0] || 0.5))
  const [ ticketError, setTicketError ] = useState<string | null>(null)
  const openOrdersQuery = usePolymarketOpenOrders(tokenIds)

  useEffect(() => {
    setSelectedOutcomeIndex(initialOutcomeIndex)
    setLimitPrice(String(prices[initialOutcomeIndex] || prices[0] || 0.5))
  }, [ initialOutcomeIndex, market.id, prices ])

  const isTradeReady = trading.isExecutionEnabled && trading.isWalletConnected && trading.hasCredentials
  const selectedOutcome = outcomes[selectedOutcomeIndex] || 'Yes'
  const selectedTokenId = tokenIds[selectedOutcomeIndex]
  const numericAmount = Number(amount)
  const numericLimitPrice = Number(limitPrice)
  const currentPrice = prices[selectedOutcomeIndex] || prices[0] || 0.5

  // For limit orders the user bets numericAmount USDC at their chosen price.
  // Shares = USDC / price. For market orders the CLOB accepts amount in USDC directly.
  const limitShares = useMemo(() => {
    if (orderMode !== 'LIMIT' || !numericLimitPrice || numericLimitPrice <= 0) {
      return 0
    }

    return numericAmount / numericLimitPrice
  }, [ numericAmount, numericLimitPrice, orderMode ])

  const estimatedShares = orderMode === 'LIMIT'
    ? limitShares
    : (currentPrice > 0 ? numericAmount / currentPrice : 0)

  const estimatedPayout = estimatedShares // each YES/NO share pays $1 if correct
  const estimatedProfit = estimatedPayout - numericAmount
  const odds = currentPrice > 0 ? (1 / currentPrice) : 0

  const readinessQuery = usePolymarketOrderReadiness(
    orderMode === 'LIMIT'
      ? {
        tokenId: selectedTokenId,
        side,
        orderMode: 'LIMIT',
        price: Number.isNaN(numericLimitPrice) ? undefined : numericLimitPrice,
        size: Number.isNaN(limitShares) || limitShares <= 0 ? undefined : limitShares,
      }
      : {
        tokenId: selectedTokenId,
        side,
        orderMode: 'MARKET',
        amount: Number.isNaN(numericAmount) ? undefined : numericAmount,
      }
  )

  const balance = readinessQuery.data?.balance ?? 0
  const quickAmounts = [ 0.1, 0.25, 0.5, 1 ]

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

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setTicketError('Enter an amount greater than zero.')
      return
    }

    if (readinessQuery.data?.reason) {
      setTicketError(readinessQuery.data.reason)
      return
    }

    if (orderMode === 'LIMIT') {
      if (Number.isNaN(numericLimitPrice) || numericLimitPrice <= 0 || numericLimitPrice >= 1) {
        setTicketError('Price must be between 0 and 1 for a limit order.')
        return
      }

      if (limitShares <= 0) {
        setTicketError('Amount and price must both be greater than zero.')
        return
      }

      await trading.placeLimitOrder({
        tokenId: selectedTokenId,
        price: numericLimitPrice,
        size: limitShares,
        side,
      })
    }
    else {
      await trading.placeMarketOrder({
        tokenId: selectedTokenId,
        amount: numericAmount,
        side,
        price: Number.isNaN(currentPrice) ? undefined : currentPrice,
        orderType: 'FOK',
      })
    }

    await openOrdersQuery.refetch()
  }

  const handleFixAllowance = async () => {
    setTicketError(null)

    if (!selectedTokenId) {
      return
    }

    const success = await trading.fixAllowance({
      tokenId: selectedTokenId,
      side,
      orderMode,
      price: Number.isNaN(numericLimitPrice) ? undefined : numericLimitPrice,
      size: orderMode === 'LIMIT' ? (limitShares > 0 ? limitShares : undefined) : undefined,
      amount: orderMode === 'MARKET' ? numericAmount : undefined,
    })

    if (success) {
      await readinessQuery.refetch()
    }
  }

  const handleFundWallet = () => {
    analytics.trackEvent('predikt_polymarket_funding_opened', {
      side,
      order_mode: orderMode,
      required_amount: readinessQuery.data?.requiredAmount,
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
    openModal('SwitchNetworkModal', { chainId: polygon.id })
  }

  const isYes = selectedOutcomeIndex === 0
  const yesColor = '#7ef0a5'
  const noColor = '#ff6f7c'
  const accentColor = isYes ? yesColor : noColor

  return (
    <div className="rounded-xl border border-white/10 bg-bg-l2 overflow-hidden">
      {/* Buy/Sell + order mode */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex gap-1 border-b border-transparent">
          <button
            className={`pb-0 pr-4 text-caption-13 font-semibold transition ${side === 'BUY' ? 'text-grey-90' : 'text-grey-50'}`}
            onClick={() => setSide('BUY')}
            type="button"
          >
            Buy
          </button>
          <button
            className={`pb-0 pr-4 text-caption-13 font-semibold transition ${side === 'SELL' ? 'text-grey-90' : 'text-grey-50'}`}
            onClick={() => setSide('SELL')}
            type="button"
          >
            Sell
          </button>
        </div>
        <select
          className="rounded-md border border-white/10 bg-transparent px-2 py-1 text-caption-12 text-grey-60 outline-none"
          value={orderMode}
          onChange={(e) => setOrderMode(e.target.value as 'LIMIT' | 'MARKET')}
        >
          <option value="MARKET">Market</option>
          <option value="LIMIT">Limit</option>
        </select>
      </div>

      <div className="p-5">
        <p className="text-caption-13 leading-5 text-grey-60">{market.question}</p>

        {/* Outcome selector */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {outcomes.map((outcome, index) => {
            const outcomePrice = prices[index]
            const cents = typeof outcomePrice === 'number' ? `${Math.round(outcomePrice * 1000) / 10}¢` : '--'
            const isYesOutcome = index === 0
            const isSelected = selectedOutcomeIndex === index
            return (
              <button
                key={`${market.id}-outcome-${index}`}
                className={`rounded-xl px-3 py-3 text-caption-13 font-semibold transition ${isSelected ? 'ring-2' : 'opacity-70 hover:opacity-90'}`}
                onClick={() => {
                  setSelectedOutcomeIndex(index)
                  setLimitPrice(String(prices[index] || limitPrice))
                }}
                style={
                  isYesOutcome
                    ? { backgroundColor: '#234f31', color: yesColor, ...(isSelected ? { boxShadow: `0 0 0 2px ${yesColor}` } : {}) }
                    : { backgroundColor: '#4c2229', color: noColor, ...(isSelected ? { boxShadow: `0 0 0 2px ${noColor}` } : {}) }
                }
                type="button"
              >
                {outcome} {cents}
              </button>
            )
          })}
        </div>

        {/* Amount field — always USDC (dollars to wager) */}
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {/* Quick % buttons based on USDC wallet balance */}
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {quickAmounts.map((pct) => {
              const label = pct === 1 ? 'Max' : `${pct * 100}%`
              const quickAmount = balance > 0 ? (balance * pct).toFixed(2) : null
              return (
                <button
                  key={label}
                  className="rounded-lg border border-white/10 py-1.5 text-caption-12 font-semibold text-grey-60 transition hover:border-white/20 hover:text-grey-90 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={balance <= 0}
                  onClick={() => quickAmount && setAmount(quickAmount)}
                  type="button"
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Limit price — only in LIMIT mode */}
        {orderMode === 'LIMIT' ? (
          <div className="mt-3">
            <div className="text-caption-12 text-grey-60">Limit Price (0–1)</div>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-bg-l3 px-3 py-3 text-caption-13 text-grey-90 outline-none"
              placeholder="0.57"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
            />
          </div>
        ) : null}

        {/* Order summary — DGPredict-style */}
        {numericAmount > 0 && !Number.isNaN(numericAmount) ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-bg-l3 px-3 py-3 space-y-2">
            <div className="flex items-center justify-between text-caption-12">
              <span className="text-grey-60">Shares</span>
              <span className="font-semibold text-grey-90">{estimatedShares > 0 ? estimatedShares.toFixed(2) : '—'}</span>
            </div>
            <div className="flex items-center justify-between text-caption-12">
              <span className="text-grey-60">Avg price</span>
              <span className="font-semibold text-grey-90">{fmtCents(orderMode === 'LIMIT' ? numericLimitPrice : currentPrice)}</span>
            </div>
            <div className="flex items-center justify-between text-caption-12">
              <span className="text-grey-60">Odds</span>
              <span className="font-semibold text-grey-90">{odds > 0 ? `${odds.toFixed(2)}x` : '—'}</span>
            </div>
            <div className="border-t border-white/10 pt-2 flex items-center justify-between text-caption-12">
              <span className="text-grey-60">Payout if correct</span>
              <span className="font-semibold" style={{ color: accentColor }}>{estimatedPayout > 0 ? fmt(estimatedPayout) : '—'}</span>
            </div>
            <div className="flex items-center justify-between text-caption-12">
              <span className="text-grey-60">Profit if correct</span>
              <span className="font-semibold" style={{ color: accentColor }}>{estimatedProfit > 0 ? `+${fmt(estimatedProfit)}` : '—'}</span>
            </div>
            <div className="border-t border-white/10 pt-2 flex items-center justify-between text-caption-12">
              <span className="font-semibold text-grey-90">Total</span>
              <span className="font-semibold text-grey-90">{fmt(numericAmount)}</span>
            </div>
          </div>
        ) : null}

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

        {/* Readiness issues — only show Fix Allowance when balance is fine but allowance isn't */}
        {readinessQuery.data?.reason ? (
          <div className="mt-3 rounded-lg border border-risk-red/30 bg-risk-red/10 px-3 py-3 text-caption-12 text-risk-red">
            <div>{readinessQuery.data.reason}</div>
            {!readinessQuery.data.isBalanceSufficient ? (
              <div className="mt-1 text-caption-12 text-risk-red/80">
                {`You have ${fmt(readinessQuery.data.balance)} but need ${fmt(readinessQuery.data.requiredAmount)}.`}
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {readinessQuery.data.isBalanceSufficient && !readinessQuery.data.isAllowanceSufficient ? (
                <button
                  className="rounded-md border border-brand-50/30 bg-brand-50/10 px-3 py-1.5 text-caption-12 font-semibold text-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={trading.isFixingAllowance}
                  onClick={() => { void handleFixAllowance() }}
                  type="button"
                >
                  {trading.isFixingAllowance ? 'Approving...' : 'Approve USDC spending'}
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
              style={{ backgroundColor: accentColor }}
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
