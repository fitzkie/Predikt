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
  onOutcomeChange?: (index: number) => void
}

const fmt = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const INCREMENT_AMOUNTS = [ 1, 5, 10, 100 ]

const PrediktsTradingPanel: React.FC<Props> = ({ market, initialOutcomeIndex = 0, onOutcomeChange }) => {
  const { account } = useWallet()
  const { connectWallet, canLogin, ready } = useOptionalPrivy()
  const analytics = useAnalytics()
  const trading = usePolymarketTrading()
  const outcomes = parsePolymarketOutcomes(market)
  const prices = parsePolymarketOutcomePrices(market)
  const tokenIds = parsePolymarketTokenIds(market)
  const [ orderMode, setOrderMode ] = useState<'LIMIT' | 'MARKET'>('MARKET')
  const [ side, setSide ] = useState<'BUY' | 'SELL'>('BUY')
  const [ selectedOutcomeIndex, setSelectedOutcomeIndex ] = useState(initialOutcomeIndex)
  const [ amount, setAmount ] = useState('10')
  const [ limitPrice, setLimitPrice ] = useState(String(prices[0] || 0.5))
  const [ ticketError, setTicketError ] = useState<string | null>(null)
  // Set true after a successful on-chain approve so the button unlocks immediately
  // while the react-query refetch is still in flight (API lags a few blocks).
  const [ isAllowanceApprovedLocally, setIsAllowanceApprovedLocally ] = useState(false)
  const openOrdersQuery = usePolymarketOpenOrders(tokenIds)

  useEffect(() => {
    setSelectedOutcomeIndex(initialOutcomeIndex)
    setLimitPrice(String(prices[initialOutcomeIndex] || prices[0] || 0.5))
  }, [ initialOutcomeIndex, market.id ])

  const isTradeReady = trading.isExecutionEnabled && trading.isWalletConnected && trading.hasCredentials
  const selectedOutcome = outcomes[selectedOutcomeIndex] || 'Yes'
  const selectedTokenId = tokenIds[selectedOutcomeIndex]
  const numericAmount = Number(amount) || 0
  const numericLimitPrice = Number(limitPrice)
  const currentPrice = prices[selectedOutcomeIndex] ?? prices[0] ?? 0.5

  const limitShares = useMemo(() => {
    if (orderMode !== 'LIMIT' || !numericLimitPrice || numericLimitPrice <= 0) return 0
    return numericAmount / numericLimitPrice
  }, [ numericAmount, numericLimitPrice, orderMode ])

  const estimatedShares = orderMode === 'LIMIT'
    ? limitShares
    : (currentPrice > 0 ? numericAmount / currentPrice : 0)

  const estimatedPayout = estimatedShares
  const avgPriceCents = Math.round((orderMode === 'LIMIT' ? numericLimitPrice : currentPrice) * 100)

  const readinessQuery = usePolymarketOrderReadiness(
    orderMode === 'LIMIT'
      ? { tokenId: selectedTokenId, side, orderMode: 'LIMIT', price: numericLimitPrice || undefined, size: limitShares > 0 ? limitShares : undefined }
      : { tokenId: selectedTokenId, side, orderMode: 'MARKET', amount: numericAmount || undefined }
  )

  const balance = readinessQuery.data?.balance ?? 0

  const handleSelectOutcome = (index: number) => {
    setSelectedOutcomeIndex(index)
    setLimitPrice(String(prices[index] ?? limitPrice))
    setIsAllowanceApprovedLocally(false)
    onOutcomeChange?.(index)
  }

  const handleAddAmount = (add: number) => {
    setAmount((prev) => {
      const current = Number(prev) || 0
      return String(Math.round((current + add) * 100) / 100)
    })
  }

  const handleEnableTrading = async () => {
    setTicketError(null)
    await trading.createOrDeriveApiKey()
    await openOrdersQuery.refetch()
  }

  const handleSubmitOrder = async () => {
    setTicketError(null)

    if (!trading.hasCredentials) {
      const creds = await trading.createOrDeriveApiKey()
      if (!creds) { setTicketError('Enable trading before placing a live order.'); return }
    }

    if (!selectedTokenId) { setTicketError('This market outcome is missing a tradable token ID.'); return }
    if (numericAmount <= 0) { setTicketError('Enter an amount greater than zero.'); return }
    // Skip stale readiness error if we've locally confirmed the approval — the context's
    // approvedUsdcAllowanceRef ensures the internal readiness check inside placeLimitOrder/
    // placeMarketOrder will also pass.
    if (readinessQuery.data?.reason && !isAllowanceApprovedLocally) {
      setTicketError(readinessQuery.data.reason); return
    }

    if (orderMode === 'LIMIT') {
      if (numericLimitPrice <= 0 || numericLimitPrice >= 1) { setTicketError('Price must be between 0 and 1 for a limit order.'); return }
      if (limitShares <= 0) { setTicketError('Amount and price must both be greater than zero.'); return }
      await trading.placeLimitOrder({ tokenId: selectedTokenId, price: numericLimitPrice, size: limitShares, side })
    }
    else {
      // Market order price must be the WORST PRICE YOU'LL ACCEPT, not the displayed mid-price.
      // For BUY: bid/ask spread means the actual ask is above the displayed price. If we pass
      // the mid-price as the limit, takerAmount ends up too high and the FOK order is rejected
      // silently. Add 10% buffer so the order matches at the actual market ask.
      // For SELL: the actual bid is below the displayed price, so subtract 10%.
      const worstAcceptablePrice = side === 'BUY'
        ? Math.min(0.999, (currentPrice || 0.5) * 1.10)
        : Math.max(0.001, (currentPrice || 0.5) * 0.90)
      await trading.placeMarketOrder({
        tokenId: selectedTokenId,
        amount: numericAmount,
        side,
        price: worstAcceptablePrice,
        orderType: 'FAK', // Fill and Kill: fill what's available, cancel the rest (tolerates partial fills)
      })
    }

    await openOrdersQuery.refetch()
  }

  const handleFixAllowance = async () => {
    setTicketError(null)
    if (!selectedTokenId) return
    const success = await trading.fixAllowance({
      tokenId: selectedTokenId, side, orderMode,
      price: numericLimitPrice || undefined,
      size: orderMode === 'LIMIT' && limitShares > 0 ? limitShares : undefined,
      amount: orderMode === 'MARKET' ? numericAmount : undefined,
    })
    if (success) {
      setIsAllowanceApprovedLocally(true)
      // Refetch in background — the ref in the context already unblocks the order
      void readinessQuery.refetch()
    }
  }

  const handleFundWallet = () => {
    analytics.trackEvent('predikt_polymarket_funding_opened', { side, order_mode: orderMode, required_amount: readinessQuery.data?.requiredAmount, token_id: selectedTokenId })
    openModal('PrediktsDepositModal')
  }

  const handleConnect = () => {
    if (canLogin && ready) { try { connectWallet(); return } catch {} }
    openModal('ConnectModal')
  }

  const handleSwitchToPolygon = () => openModal('SwitchNetworkModal', { chainId: polygon.id })

  const yesColor = '#7ef0a5'
  const noColor = '#ff6f7c'
  const isYes = selectedOutcomeIndex === 0
  const accentColor = isYes ? yesColor : noColor
  const marketImage = market.image || market.icon || (market as any).events?.[0]?.image || (market as any).events?.[0]?.icon || ''

  return (
    <div className="rounded-xl border border-white/10 bg-bg-l2 overflow-hidden">

      {/* Panel header */}
      {marketImage && (
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/10">
          <img alt="" className="w-9 h-9 flex-none rounded-lg object-cover" src={marketImage} />
          <div className="min-w-0">
            <p className="text-caption-12 text-grey-60 line-clamp-1">{market.question}</p>
            <p className="text-caption-12 text-grey-50 mt-0.5">
              {market.endDate ? new Date(market.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Open'}
              {' · '}
              <span style={{ color: accentColor }}>{selectedOutcome}</span>
            </p>
          </div>
        </div>
      )}

      {/* Buy / Sell tabs + order mode */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0">
        <div className="flex gap-5">
          {([ 'BUY', 'SELL' ] as const).map((s) => (
            <button
              key={s}
              className={`pb-2 text-caption-14 font-semibold border-b-2 transition-colors ${side === s ? 'border-grey-90 text-grey-90' : 'border-transparent text-grey-50 hover:text-grey-70'}`}
              onClick={() => setSide(s)}
              type="button"
            >
              {s === 'BUY' ? 'Buy' : 'Sell'}
            </button>
          ))}
        </div>
        <select
          className="rounded-md border border-white/10 bg-transparent px-2 py-1 text-caption-12 text-grey-60 outline-none mb-2"
          value={orderMode}
          onChange={(e) => setOrderMode(e.target.value as 'LIMIT' | 'MARKET')}
        >
          <option value="MARKET">Market</option>
          <option value="LIMIT">Limit</option>
        </select>
      </div>
      <div className="border-b border-white/10" />

      <div className="p-4 space-y-4">
        {!marketImage && (
          <p className="text-caption-13 leading-5 text-grey-60">{market.question}</p>
        )}

        {/* Yes / No outcome buttons */}
        <div className="grid grid-cols-2 gap-2">
          {outcomes.map((outcome, index) => {
            const outcomePrice = prices[index]
            const cents = typeof outcomePrice === 'number' ? `${Math.round(outcomePrice * 1000) / 10}¢` : '--'
            const isYesOutcome = index === 0
            const isSelected = selectedOutcomeIndex === index
            return (
              <button
                key={`${market.id}-outcome-${index}`}
                className={`rounded-xl px-3 py-3 text-caption-14 font-semibold transition ${isSelected ? '' : 'opacity-50 hover:opacity-75'}`}
                onClick={() => handleSelectOutcome(index)}
                style={
                  isYesOutcome
                    ? { backgroundColor: isSelected ? '#234f31' : '#1a3424', color: yesColor, ...(isSelected ? { boxShadow: `0 0 0 2px ${yesColor}` } : {}) }
                    : { backgroundColor: isSelected ? '#4c2229' : '#2e1519', color: noColor, ...(isSelected ? { boxShadow: `0 0 0 2px ${noColor}` } : {}) }
                }
                type="button"
              >
                {outcome} {cents}
              </button>
            )
          })}
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center justify-between text-caption-12 text-grey-60 mb-2">
            <span className="font-medium text-grey-90 text-caption-13">Amount</span>
            {balance > 0 && <span>{fmt(balance)} cash</span>}
          </div>
          <div className="flex items-center rounded-xl border border-white/15 bg-bg-l3 px-4 py-3">
            <span className="mr-1 text-[1.4rem] font-semibold text-grey-60">$</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-[1.6rem] font-semibold text-grey-90 outline-none leading-none"
              min="0"
              placeholder="0"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {/* Fixed increment buttons — Polymarket style */}
          <div className="mt-2 flex gap-1.5">
            {INCREMENT_AMOUNTS.map((add) => (
              <button
                key={add}
                className="flex-1 rounded-lg border border-white/10 py-1.5 text-caption-12 font-semibold text-grey-60 transition hover:border-white/20 hover:text-grey-90"
                onClick={() => handleAddAmount(add)}
                type="button"
              >
                +${add}
              </button>
            ))}
          </div>
        </div>

        {/* Limit price (LIMIT mode only) */}
        {orderMode === 'LIMIT' && (
          <div>
            <div className="text-caption-12 text-grey-60 mb-2">Limit Price (0–1)</div>
            <input
              className="w-full rounded-xl border border-white/10 bg-bg-l3 px-3 py-3 text-caption-13 text-grey-90 outline-none"
              placeholder="0.57"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
            />
          </div>
        )}

        {/* To win — always green, dollar bill icon */}
        {numericAmount > 0 && estimatedPayout > 0 && (
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-caption-13 text-grey-60">
                To win 💵
              </span>
              <span className="text-[1.8rem] font-bold leading-none text-[#7ef0a5]">
                {fmt(estimatedPayout)}
              </span>
            </div>
            <div className="mt-1 text-caption-12 text-grey-50">
              Avg. Price {avgPriceCents}¢
            </div>
          </div>
        )}

        {/* Errors */}
        {(trading.authError || trading.executionError || ticketError) && (
          <div className="rounded-lg border border-risk-red/30 bg-risk-red/10 px-3 py-3 text-caption-12 text-risk-red">
            {trading.authError || trading.executionError || ticketError}
          </div>
        )}
        {trading.lastExecutionMessage && (
          <div className="rounded-lg border border-[#7ef0a5]/20 bg-[#7ef0a5]/10 px-3 py-3 text-caption-12 text-[#7ef0a5]">
            {trading.lastExecutionMessage}
          </div>
        )}

        {/* Readiness CTAs — hide allowance error once locally approved */}
        {readinessQuery.data?.reason && !isAllowanceApprovedLocally && (
          <div className="rounded-lg border border-risk-red/30 bg-risk-red/10 px-3 py-3 text-caption-12 text-risk-red">
            <div>{readinessQuery.data.reason}</div>
            {!readinessQuery.data.isBalanceSufficient && (
              <div className="mt-1 text-risk-red/80">
                {`You have ${fmt(readinessQuery.data.balance)} but need ${fmt(readinessQuery.data.requiredAmount)}.`}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {readinessQuery.data.isBalanceSufficient && !readinessQuery.data.isAllowanceSufficient && (
                <button
                  className="rounded-md border border-brand-50/30 bg-brand-50/10 px-3 py-1.5 text-caption-12 font-semibold text-brand-50 disabled:opacity-50"
                  disabled={trading.isFixingAllowance}
                  onClick={() => { void handleFixAllowance() }}
                  type="button"
                >
                  {trading.isFixingAllowance ? 'Approving...' : 'Approve USDC spending'}
                </button>
              )}
              {!readinessQuery.data.isBalanceSufficient && (
                <button
                  className="rounded-md border border-brand-50/30 bg-brand-50/10 px-3 py-1.5 text-caption-12 font-semibold text-brand-50"
                  onClick={handleFundWallet}
                  type="button"
                >
                  Deposit USDC
                </button>
              )}
            </div>
          </div>
        )}

        {/* Primary action */}
        <div>
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
              className="w-full rounded-xl bg-brand-50 px-4 py-3 text-caption-13 font-semibold text-black disabled:opacity-50"
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
              className="w-full rounded-xl bg-brand-50 px-4 py-3.5 text-caption-14 font-bold text-black disabled:opacity-50 hover:bg-brand-50/90 transition-colors"
              disabled={!isTradeReady || trading.isSubmittingOrder || (Boolean(readinessQuery.data?.reason) && !isAllowanceApprovedLocally) || (readinessQuery.isFetching && !isAllowanceApprovedLocally) || trading.isCheckingReadiness}
              onClick={() => { void handleSubmitOrder() }}
              type="button"
            >
              {trading.isSubmittingOrder ? 'Submitting...' : `${side === 'BUY' ? 'Buy' : 'Sell'} ${selectedOutcome}`}
            </button>
          )}
        </div>

        {/* Open orders */}
        {(openOrdersQuery.data?.length || openOrdersQuery.isLoading) ? (
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between text-caption-12 text-grey-60 mb-3">
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
            <div className="space-y-2">
              {openOrdersQuery.isLoading ? (
                <div className="text-caption-12 text-grey-60">Loading...</div>
              ) : openOrdersQuery.data?.map((order) => {
                const remaining = Math.max(Number(order.original_size) - Number(order.size_matched), 0)
                return (
                  <div key={order.id} className="rounded-lg border border-white/10 bg-bg-l3 p-3">
                    <div className="flex items-center justify-between text-caption-12">
                      <span className="font-semibold text-grey-90">{order.side} {order.outcome} @ {order.price}</span>
                      <span className="text-grey-60">{remaining.toFixed(2)} left</span>
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
