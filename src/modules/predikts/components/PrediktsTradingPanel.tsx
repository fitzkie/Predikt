'use client'

import { useMemo, useState } from 'react'
import { openModal } from '@locmod/modal'
import { useAnalytics } from 'providers/analytics'
import { useOptionalPrivy } from 'providers/auth'
import { parsePolymarketOutcomePrices, parsePolymarketOutcomes, parsePolymarketTokenIds, type PolymarketApiCredentials, type PolymarketMarket, usePolymarketOpenOrders, usePolymarketOrderReadiness, usePolymarketTrading } from 'providers/polymarket'
import { useWallet } from 'wallet'

import { Button, buttonMessages } from 'components/inputs'


type Props = {
  market: PolymarketMarket
}

const initialCredentials: PolymarketApiCredentials = {
  apiKey: '',
  passphrase: '',
  secret: '',
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

const PrediktsTradingPanel: React.FC<Props> = ({ market }) => {
  const { account, chainId, isAAWallet } = useWallet()
  const { login } = useOptionalPrivy()
  const analytics = useAnalytics()
  const trading = usePolymarketTrading()
  const outcomes = parsePolymarketOutcomes(market)
  const prices = parsePolymarketOutcomePrices(market)
  const tokenIds = parsePolymarketTokenIds(market)
  const [ orderMode, setOrderMode ] = useState<'LIMIT' | 'MARKET'>('LIMIT')
  const [ side, setSide ] = useState<'BUY' | 'SELL'>('BUY')
  const [ selectedOutcomeIndex, setSelectedOutcomeIndex ] = useState(0)
  const [ size, setSize ] = useState('25')
  const [ price, setPrice ] = useState(String(prices[0] || 0.5))
  const [ marketOrderType, setMarketOrderType ] = useState<'FOK' | 'FAK'>('FOK')
  const [ credentials, setCredentials ] = useState<PolymarketApiCredentials>(initialCredentials)
  const [ ticketError, setTicketError ] = useState<string | null>(null)
  const openOrdersQuery = usePolymarketOpenOrders(tokenIds)

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

  const handleSaveCredentials = () => {
    trading.saveCredentials({
      ...credentials,
      walletAddress: account || undefined,
    })
    setCredentials(initialCredentials)
  }

  const handleSubmitOrder = async () => {
    setTicketError(null)

    if (!selectedTokenId) {
      setTicketError('This market outcome is missing a Polymarket token ID.')
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
        setTicketError('Price must be between 0 and 1 for a Polymarket limit order.')
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
      setTicketError('This market outcome is missing a Polymarket token ID.')
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
    const fundingAsset = side === 'BUY' ? 'USDC' : `${selectedOutcome} shares`

    analytics.trackEvent('predikt_polymarket_funding_opened', {
      asset: fundingAsset,
      side,
      order_mode: orderMode,
      required_amount: requiredAmount,
      token_id: selectedTokenId,
    })

    openModal('FundingModal', {
      initialTab: 'deposit',
      depositProps: {
        type: 'bet',
        toAmount: typeof requiredAmount === 'number' && !Number.isNaN(requiredAmount)
          ? requiredAmount.toFixed(2)
          : undefined,
      },
    })
  }

  return (
    <div className="rounded-xl border border-white/10 bg-bg-l2 p-5">
      <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">Trading readiness</div>
      <div className="mt-3 text-heading-h4 font-semibold text-grey-90">Authenticated CLOB execution</div>
      <p className="mt-3 text-caption-14 leading-6 text-grey-70">
        {trading.statusMessage}
      </p>
      {
        trading.authError ? (
          <div className="mt-4 rounded-md border border-risk-red/30 bg-risk-red/10 px-3 py-3 text-caption-13 text-risk-red">
            {trading.authError}
          </div>
        ) : null
      }
      {
        trading.executionError || ticketError ? (
          <div className="mt-4 rounded-md border border-risk-red/30 bg-risk-red/10 px-3 py-3 text-caption-13 text-risk-red">
            {trading.executionError || ticketError}
          </div>
        ) : null
      }
      {
        trading.lastExecutionMessage ? (
          <div className="mt-4 rounded-md border border-success-green/20 bg-success-green/10 px-3 py-3 text-caption-13 text-success-green">
            {trading.lastExecutionMessage}
          </div>
        ) : null
      }
      {
        readinessQuery.data ? (
          <div className={`mt-4 rounded-md border px-3 py-3 text-caption-13 ${readinessQuery.data.reason ? 'border-risk-red/30 bg-risk-red/10 text-risk-red' : 'border-success-green/20 bg-success-green/10 text-success-green'}`}>
            <div className="font-semibold">
              {readinessQuery.data.reason ? 'Balance or allowance check failed' : 'Balance and allowance look ready'}
            </div>
            <div className="mt-2 text-caption-12">
              Required: {formatCurrency(readinessQuery.data.requiredAmount)} • Balance: {formatCurrency(readinessQuery.data.balance)} • Max allowance: {formatCurrency(readinessQuery.data.maxAllowance)}
            </div>
            {
              readinessQuery.data.reason ? (
                <div className="mt-2 space-y-3 text-caption-12">
                  <div>{readinessQuery.data.reason}</div>
                  <div className="flex flex-wrap gap-2">
                    {
                      !readinessQuery.data.isAllowanceSufficient ? (
                        <button
                          className="rounded-md border border-brand-50/30 bg-brand-50/10 px-3 py-2 text-caption-12 font-semibold text-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={trading.isFixingAllowance}
                          onClick={() => {
                            void handleFixAllowance()
                          }}
                        >
                          {trading.isFixingAllowance ? 'Updating Allowance...' : `Fix allowance for ${readinessQuery.data.assetType === 'COLLATERAL' ? 'USDC' : 'shares'}`}
                        </button>
                      ) : null
                    }
                    {
                      !readinessQuery.data.isBalanceSufficient ? (
                        <button
                          className="rounded-md border border-white/10 bg-bg-l2 px-3 py-2 text-caption-12 font-semibold text-grey-90"
                          onClick={handleFundWallet}
                        >
                          Fund wallet
                        </button>
                      ) : null
                    }
                  </div>
                  {
                    !readinessQuery.data.isBalanceSufficient ? (
                      <div className="text-grey-60">
                        Open the funding flow to top up {balanceAssetLabel} before retrying this order.
                      </div>
                    ) : null
                  }
                </div>
              ) : null
            }
          </div>
        ) : readinessQuery.isFetching || trading.isCheckingReadiness ? (
          <div className="mt-4 rounded-md border border-white/10 bg-bg-l3 px-3 py-3 text-caption-12 text-grey-60">
            Checking balance and allowance for this order...
          </div>
        ) : null
      }

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          className={`rounded-md border px-3 py-2 text-caption-13 font-semibold transition ${orderMode === 'LIMIT' ? 'border-brand-50 bg-brand-50/10 text-grey-90' : 'border-white/10 text-grey-60'}`}
          onClick={() => setOrderMode('LIMIT')}
        >
          Limit
        </button>
        <button
          className={`rounded-md border px-3 py-2 text-caption-13 font-semibold transition ${orderMode === 'MARKET' ? 'border-brand-50 bg-brand-50/10 text-grey-90' : 'border-white/10 text-grey-60'}`}
          onClick={() => setOrderMode('MARKET')}
        >
          Market
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className={`rounded-md border px-3 py-2 text-caption-13 font-semibold transition ${side === 'BUY' ? 'border-brand-50 bg-brand-50/10 text-grey-90' : 'border-white/10 text-grey-60'}`}
          onClick={() => setSide('BUY')}
        >
          Buy
        </button>
        <button
          className={`rounded-md border px-3 py-2 text-caption-13 font-semibold transition ${side === 'SELL' ? 'border-brand-50 bg-brand-50/10 text-grey-90' : 'border-white/10 text-grey-60'}`}
          onClick={() => setSide('SELL')}
        >
          Sell
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <div className="text-caption-12 uppercase tracking-[0.14em] text-grey-60">Outcome</div>
          <select
            className="mt-2 w-full rounded-md border border-white/10 bg-bg-l3 px-3 py-2 text-caption-13 text-grey-90"
            value={selectedOutcomeIndex}
            onChange={(event) => {
              const nextIndex = Number(event.target.value)
              setSelectedOutcomeIndex(nextIndex)
              setPrice(String(prices[nextIndex] || price))
            }}
          >
            {outcomes.map((outcome, index) => (
              <option key={`${market.id}-${outcome}`} value={index}>{outcome}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-caption-12 uppercase tracking-[0.14em] text-grey-60">
            {orderMode === 'LIMIT' ? 'Price' : 'Price cap (optional)'}
          </div>
          <input
            className="mt-2 w-full rounded-md border border-white/10 bg-bg-l3 px-3 py-2 text-caption-13 text-grey-90"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder={orderMode === 'LIMIT' ? '0.57' : 'Leave blank to use market price'}
          />
        </label>

        <label className="block">
          <div className="text-caption-12 uppercase tracking-[0.14em] text-grey-60">
            {orderMode === 'LIMIT'
              ? 'Size'
              : side === 'BUY'
                ? 'Amount (USDC)'
                : 'Shares to sell'}
          </div>
          <input
            className="mt-2 w-full rounded-md border border-white/10 bg-bg-l3 px-3 py-2 text-caption-13 text-grey-90"
            value={size}
            onChange={(event) => setSize(event.target.value)}
          />
        </label>

        {
          orderMode === 'MARKET' ? (
            <label className="block">
              <div className="text-caption-12 uppercase tracking-[0.14em] text-grey-60">Execution</div>
              <select
                className="mt-2 w-full rounded-md border border-white/10 bg-bg-l3 px-3 py-2 text-caption-13 text-grey-90"
                value={marketOrderType}
                onChange={(event) => setMarketOrderType(event.target.value as 'FOK' | 'FAK')}
              >
                <option value="FOK">FOK • Fill or Kill</option>
                <option value="FAK">FAK • Fill and Kill</option>
              </select>
            </label>
          ) : null
        }
      </div>

      <div className="mt-4 rounded-md border border-white/10 px-3 py-3 text-caption-13 text-grey-60">
        <div className="flex items-center justify-between gap-3">
          <span>Order type</span>
          <span className="text-grey-90">{orderMode}{orderMode === 'MARKET' ? ` • ${marketOrderType}` : ''}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Side</span>
          <span className="text-grey-90">{side} {selectedOutcome}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span>Estimated notional</span>
          <span className="text-grey-90">{estimatedNotional}</span>
        </div>
      </div>

      {
        !account ? (
          <Button className="mt-5 w-full" size={40} title={buttonMessages.connectWallet} onClick={login} />
        ) : (
          <div className="mt-5 space-y-2">
            <button
              className="w-full rounded-md border border-brand-50/30 bg-brand-50/10 px-4 py-3 text-caption-13 font-semibold text-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={trading.isAuthenticating || !trading.isReadyForAuthentication || !trading.isOnSupportedChain}
              onClick={() => {
                void trading.createOrDeriveApiKey()
              }}
            >
              {trading.isAuthenticating
                ? 'Authenticating With Polymarket...'
                : trading.hasCredentials
                  ? 'Refresh API Credentials'
                  : 'Create or Derive API Credentials'}
            </button>
            <div className="text-caption-12 text-grey-60">
              Wallet chain: {chainId || 'Unknown'} {trading.isOnSupportedChain ? '(Polygon ready)' : '(Switch to Polygon)'} {isAAWallet ? '• Smart wallet detected' : '• EOA wallet detected'}
            </div>
            <button
              className="w-full rounded-md border border-white/10 px-4 py-3 text-caption-13 font-semibold text-grey-60 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isTradeReady}
            >
              {isTradeReady ? 'Execution Ready' : 'Execution Disabled'}
            </button>
            <button
              className="w-full rounded-md border border-brand-50 bg-brand-50 px-4 py-3 text-caption-13 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isTradeReady || trading.isSubmittingOrder || Boolean(readinessQuery.data?.reason) || readinessQuery.isFetching || trading.isCheckingReadiness}
              onClick={() => {
                void handleSubmitOrder()
              }}
            >
              {trading.isSubmittingOrder ? 'Submitting Order...' : `Place ${side} ${orderMode} Order`}
            </button>
          </div>
        )
      }

      <div className="mt-6 rounded-xl border border-white/10 bg-bg-l3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-caption-12 uppercase tracking-[0.14em] text-grey-60">Open orders</div>
            <p className="mt-2 text-caption-13 leading-6 text-grey-70">
              Live authenticated orders for this market’s token outcomes.
            </p>
          </div>
          <button
            className="rounded-md border border-white/10 px-3 py-2 text-caption-12 font-semibold text-grey-60 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={openOrdersQuery.isFetching || !trading.hasCredentials}
            onClick={() => {
              void openOrdersQuery.refetch()
            }}
          >
            {openOrdersQuery.isFetching || trading.isRefreshingOrders ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {
            openOrdersQuery.isLoading ? (
              <div className="text-caption-13 text-grey-60">Loading open orders...</div>
            ) : openOrdersQuery.data?.length ? openOrdersQuery.data.map((order) => {
              const remainingSize = Math.max(Number(order.original_size) - Number(order.size_matched), 0)

              return (
                <div key={order.id} className="rounded-lg border border-white/10 bg-bg-l2 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-caption-13 font-semibold text-grey-90">{order.side} {order.outcome}</div>
                    <div className="text-caption-12 text-grey-60">{order.status}</div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-caption-12 text-grey-60">
                    <div>Price: <span className="text-grey-90">{order.price}</span></div>
                    <div>Remaining: <span className="text-grey-90">{remainingSize.toFixed(2)}</span></div>
                    <div>Created: <span className="text-grey-90">{formatDateTime(order.created_at)}</span></div>
                    <div>Type: <span className="text-grey-90">{order.order_type}</span></div>
                  </div>
                  <button
                    className="mt-3 rounded-md border border-risk-red/30 px-3 py-2 text-caption-12 font-semibold text-risk-red disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={trading.isCancellingOrderId === order.id}
                    onClick={() => {
                      void trading.cancelOrder(order.id)
                    }}
                  >
                    {trading.isCancellingOrderId === order.id ? 'Cancelling...' : 'Cancel order'}
                  </button>
                </div>
              )
            }) : (
              <div className="text-caption-13 text-grey-60">
                {trading.hasCredentials
                  ? 'No open authenticated orders are loaded for this market yet.'
                  : 'Authenticate with Polymarket to load and manage open orders.'}
              </div>
            )
          }
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-bg-l3 p-4">
        <div className="text-caption-12 uppercase tracking-[0.14em] text-grey-60">Credential scaffold</div>
        <p className="mt-3 text-caption-13 leading-6 text-grey-70">
          Polymarket trading requires wallet-based L1 auth plus L2 API credentials. The button above now performs the real create-or-derive flow, and the live ticket submits authenticated signed orders through the CLOB. Manual fields remain as a fallback.
        </p>
        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-md border border-white/10 bg-bg-l2 px-3 py-2 text-caption-13 text-grey-90"
            placeholder="POLY_API_KEY"
            value={credentials.apiKey}
            onChange={(event) => setCredentials((current) => ({ ...current, apiKey: event.target.value }))}
          />
          <input
            className="w-full rounded-md border border-white/10 bg-bg-l2 px-3 py-2 text-caption-13 text-grey-90"
            placeholder="POLY_PASSPHRASE"
            value={credentials.passphrase}
            onChange={(event) => setCredentials((current) => ({ ...current, passphrase: event.target.value }))}
          />
          <textarea
            className="min-h-24 w-full rounded-md border border-white/10 bg-bg-l2 px-3 py-2 text-caption-13 text-grey-90"
            placeholder="POLY_SECRET"
            value={credentials.secret}
            onChange={(event) => setCredentials((current) => ({ ...current, secret: event.target.value }))}
          />
        </div>
        <div className="mt-4 flex gap-2">
          <button
            className="rounded-md border border-brand-50/30 bg-brand-50/10 px-4 py-2 text-caption-13 font-semibold text-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!credentials.apiKey || !credentials.passphrase || !credentials.secret}
            onClick={handleSaveCredentials}
          >
            Save Credentials
          </button>
          <button
            className="rounded-md border border-white/10 px-4 py-2 text-caption-13 text-grey-60"
            onClick={trading.clearCredentials}
          >
            Clear Stored
          </button>
        </div>
      </div>
    </div>
  )
}

export default PrediktsTradingPanel
