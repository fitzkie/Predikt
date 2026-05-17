'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAnalytics } from 'providers/analytics'
import { useOptionalPrivy } from 'providers/auth'
import { openModal } from '@locmod/modal'
import { parsePolymarketOutcomePrices, parsePolymarketOutcomes, parsePolymarketTokenIds, type PolymarketMarket, usePolymarketOpenOrders, usePolymarketTrading } from 'providers/polymarket'
import { useWallet } from 'wallet'

import { Button, buttonMessages } from 'components/inputs'


type Props = {
  market: PolymarketMarket
  initialOutcomeIndex?: number
  onOutcomeChange?: (index: number) => void
}

type DbOrder = {
  id: string
  tokenId: string
  side: string
  amount: string
  price: number
  status: string
}

const fmt = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const INCREMENT_AMOUNTS = [ 1, 5, 10, 100 ]

const isMatched = (status: string) =>
  status === 'MATCHED' || status.toLowerCase() === 'matched'

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
  const [ showDepositInfo, setShowDepositInfo ] = useState(false)
  const [ copied, setCopied ] = useState(false)
  const openOrdersQuery = usePolymarketOpenOrders(tokenIds)

  // Fetch the user's DB orders for this market so we can show their position
  const positionQuery = useQuery<DbOrder[]>({
    queryKey: [ 'predikts', 'position', account?.toLowerCase(), ...tokenIds ],
    queryFn: async () => {
      const params = new URLSearchParams({ userAddress: account! })
      if (tokenIds.length) params.set('tokenIds', tokenIds.join(','))
      const r = await fetch(`/api/predikts/orders?${params}`)
      if (!r.ok) return []
      return r.json()
    },
    enabled: Boolean(account) && tokenIds.length > 0,
    staleTime: 15_000,
  })

  // Shares owned per tokenId: sum(amount/price) for matched BUY minus sum for matched SELL
  const sharesOwnedByTokenId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const order of positionQuery.data || []) {
      if (!isMatched(order.status)) continue
      const shares = Number(order.amount) / order.price
      map[order.tokenId] = (map[order.tokenId] || 0) + (order.side === 'BUY' ? shares : -shares)
    }
    return map
  }, [ positionQuery.data ])

  useEffect(() => {
    setSelectedOutcomeIndex(initialOutcomeIndex)
    setLimitPrice(String(prices[initialOutcomeIndex] || prices[0] || 0.5))
  }, [ initialOutcomeIndex, market.id ])

  const selectedOutcome = outcomes[selectedOutcomeIndex] || 'Yes'
  const selectedTokenId = tokenIds[selectedOutcomeIndex]
  const numericAmount = Number(amount) || 0
  const numericLimitPrice = Number(limitPrice)
  const currentPrice = prices[selectedOutcomeIndex] ?? prices[0] ?? 0.5
  const sharesOwned = selectedTokenId ? Math.max(0, sharesOwnedByTokenId[selectedTokenId] || 0) : 0
  const positionValue = sharesOwned * currentPrice

  const limitShares = useMemo(() => {
    if (orderMode !== 'LIMIT' || !numericLimitPrice || numericLimitPrice <= 0) return 0
    return numericAmount / numericLimitPrice
  }, [ numericAmount, numericLimitPrice, orderMode ])

  const estimatedShares = orderMode === 'LIMIT'
    ? limitShares
    : (currentPrice > 0 ? numericAmount / currentPrice : 0)

  const estimatedPayout = estimatedShares
  const avgPriceCents = Math.round((orderMode === 'LIMIT' ? numericLimitPrice : currentPrice) * 100)

  const balance = trading.userBalance

  const handleSelectOutcome = (index: number) => {
    setSelectedOutcomeIndex(index)
    setLimitPrice(String(prices[index] ?? limitPrice))
    onOutcomeChange?.(index)
  }

  const handleAddAmount = (add: number) => {
    setAmount((prev) => {
      const current = Number(prev) || 0
      return String(Math.round((current + add) * 100) / 100)
    })
  }

  const handleSellPosition = () => {
    if (sharesOwned <= 0) return
    setSide('SELL')
    setAmount(String(Math.round(sharesOwned * 100) / 100))
  }

  const handleSubmitOrder = async () => {
    if (!selectedTokenId) return
    if (numericAmount <= 0) return

    if (side === 'BUY' && balance < numericAmount) {
      setShowDepositInfo(true)
      return
    }

    if (orderMode === 'LIMIT') {
      if (numericLimitPrice <= 0 || numericLimitPrice >= 1) return
      if (limitShares <= 0) return
      await trading.placeLimitOrder({ tokenId: selectedTokenId, price: numericLimitPrice, size: limitShares, side, marketQuestion: market.question })
    }
    else {
      const worstPrice = side === 'BUY'
        ? Math.min(0.999, (currentPrice || 0.5) * 1.10)
        : Math.max(0.001, (currentPrice || 0.5) * 0.90)
      await trading.placeMarketOrder({ tokenId: selectedTokenId, amount: numericAmount, side, price: worstPrice, orderType: 'FAK', marketQuestion: market.question })
    }

    await openOrdersQuery.refetch()
    positionQuery.refetch()
  }

  const handleCopyAddress = () => {
    if (trading.platformAddress) {
      navigator.clipboard.writeText(trading.platformAddress).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleConnect = () => {
    if (canLogin && ready) { try { connectWallet(); return } catch {} }
    openModal('ConnectModal')
  }

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

        {/* Yes / No outcome buttons with position overlay */}
        <div className="grid grid-cols-2 gap-2">
          {outcomes.map((outcome, index) => {
            const outcomePrice = prices[index]
            const cents = typeof outcomePrice === 'number' ? `${Math.round(outcomePrice * 1000) / 10}¢` : '--'
            const isYesOutcome = index === 0
            const isSelected = selectedOutcomeIndex === index
            const tokenId = tokenIds[index]
            const owned = tokenId ? Math.max(0, sharesOwnedByTokenId[tokenId] || 0) : 0
            return (
              <div key={`${market.id}-outcome-${index}`} className="flex flex-col gap-1">
                <button
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
                {owned > 0.01 && (
                  <div className="text-caption-11 text-grey-60 text-center">
                    {owned.toFixed(2)} shares ({fmt(owned * (prices[index] ?? 0.5))})
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Amount / shares input */}
        <div>
          <div className="flex items-center justify-between text-caption-12 text-grey-60 mb-2">
            <span className="font-medium text-grey-90 text-caption-13">
              {side === 'SELL' ? 'Shares to sell' : 'Amount'}
            </span>
            {account && side === 'BUY' && (
              <button className="text-grey-50 hover:text-grey-90 transition-colors" onClick={() => setShowDepositInfo((v) => !v)} type="button">
                {fmt(balance)} cash
              </button>
            )}
            {account && side === 'SELL' && sharesOwned > 0 && (
              <button className="text-grey-50 hover:text-grey-90 transition-colors" onClick={handleSellPosition} type="button">
                Max {sharesOwned.toFixed(2)} shares
              </button>
            )}
          </div>
          <div className="flex items-center rounded-xl border border-white/15 bg-bg-l3 px-4 py-3">
            {side === 'BUY' && <span className="mr-1 text-[1.4rem] font-semibold text-grey-60">$</span>}
            <input
              className="min-w-0 flex-1 bg-transparent text-[1.6rem] font-semibold text-grey-90 outline-none leading-none"
              min="0"
              placeholder="0"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {side === 'BUY' && (
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
          )}
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

        {/* To win / proceeds */}
        {numericAmount > 0 && (
          <div>
            {side === 'BUY' && estimatedPayout > 0 && (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-caption-13 text-grey-60">To win 💵</span>
                  <span className="text-[1.8rem] font-bold leading-none text-[#7ef0a5]">{fmt(estimatedPayout)}</span>
                </div>
                <div className="mt-1 text-caption-12 text-grey-50">Avg. Price {avgPriceCents}¢</div>
              </>
            )}
            {side === 'SELL' && (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-caption-13 text-grey-60">Estimated proceeds</span>
                  <span className="text-[1.8rem] font-bold leading-none text-[#7ef0a5]">{fmt(numericAmount * currentPrice)}</span>
                </div>
                <div className="mt-1 text-caption-12 text-grey-50">@ {Math.round(currentPrice * 100)}¢ per share</div>
              </>
            )}
          </div>
        )}

        {/* Deposit info panel */}
        {showDepositInfo && trading.platformAddress && (
          <div className="rounded-lg border border-brand-50/20 bg-brand-50/5 p-3 space-y-2">
            <div className="text-caption-12 font-semibold text-grey-90">Deposit USDC to trade</div>
            <div className="text-caption-12 text-grey-60 leading-5">
              Send native USDC on Polygon to the address below. Your balance updates automatically.
            </div>
            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-bg-l3 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[11px] font-mono text-grey-70">{trading.platformAddress}</span>
              <button
                className="flex-none text-caption-11 font-semibold text-brand-50 hover:text-brand-50/80 transition-colors"
                onClick={handleCopyAddress}
                type="button"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button className="text-caption-11 text-grey-50 hover:text-grey-70" onClick={() => setShowDepositInfo(false)} type="button">
              Dismiss
            </button>
          </div>
        )}

        {/* Errors and success messages */}
        {trading.executionError && (
          <div className="rounded-lg border border-risk-red/30 bg-risk-red/10 px-3 py-3 text-caption-12 text-risk-red">
            {trading.executionError}
          </div>
        )}
        {trading.lastExecutionMessage && (
          <div className="rounded-lg border border-[#7ef0a5]/20 bg-[#7ef0a5]/10 px-3 py-3 text-caption-12 text-[#7ef0a5]">
            {trading.lastExecutionMessage}
          </div>
        )}

        {/* Primary action */}
        <div>
          {!account ? (
            <Button className="w-full" size={40} title={buttonMessages.connectWallet} onClick={handleConnect} />
          ) : (
            <button
              className="w-full rounded-xl bg-brand-50 px-4 py-3.5 text-caption-14 font-bold text-black disabled:opacity-50 hover:bg-brand-50/90 transition-colors"
              disabled={trading.isSubmittingOrder || numericAmount <= 0 || !selectedTokenId}
              onClick={() => { void handleSubmitOrder() }}
              type="button"
            >
              {trading.isSubmittingOrder
                ? 'Submitting...'
                : orderMode === 'LIMIT'
                  ? `Place ${side === 'BUY' ? 'Buy' : 'Sell'} ${selectedOutcome} Order`
                  : `${side === 'BUY' ? 'Buy' : 'Sell'} ${selectedOutcome}`}
            </button>
          )}
        </div>

        {/* Open orders from Polymarket */}
        {(openOrdersQuery.data?.length || openOrdersQuery.isLoading) ? (
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between text-caption-12 text-grey-60 mb-3">
              <span className="uppercase tracking-[0.14em]">Open orders</span>
              <button
                className="text-grey-50 hover:text-grey-90 disabled:opacity-50"
                disabled={openOrdersQuery.isFetching}
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
