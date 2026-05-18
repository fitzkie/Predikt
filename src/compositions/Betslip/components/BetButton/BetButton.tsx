'use client'

import React, { useState } from 'react'
import cx from 'classnames'
import { useBaseBetslip, useChain, useDetailedBetslip } from '@azuro-org/sdk'
import { Message } from '@locmod/intl'
import { openModal } from '@locmod/modal'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAnalytics } from 'providers/analytics'
import { useWallet } from 'wallet'
import { toLocaleString } from 'helpers'

import { Icon } from 'components/ui'
import { Warning } from 'components/feedback'
import { buttonMessages } from 'components/inputs'

import messages from './messages'


type BetButtonProps = {
  isEnoughBalance: boolean
  isBalanceFetching: boolean
}

const BetButton: React.FC<BetButtonProps> = () => {
  const analytics = useAnalytics()
  const { account: address } = useWallet()
  const { betToken } = useChain()
  const { items, clear } = useBaseBetslip()
  const {
    betAmount, odds, totalOdds,
    isBetAllowed, isOddsFetching, isStatesFetching, isMaxBetFetching,
  } = useDetailedBetslip()
  const queryClient = useQueryClient()
  const [ isSubmitting, setSubmitting ] = useState(false)
  const [ submitError, setSubmitError ] = useState<string | null>(null)

  // Platform balance
  const { data: balanceData, isLoading: isBalanceFetching } = useQuery<{ balance: number }>({
    queryKey: [ 'platform-balance', address?.toLowerCase() ],
    queryFn: () => fetch(`/api/predikts/balance?address=${address}`).then((r) => r.json()),
    enabled: Boolean(address),
    staleTime: 10_000,
  })

  const platformBalance = balanceData?.balance ?? 0
  const numericBetAmount = parseFloat(betAmount || '0')
  const isEnoughBalance = !numericBetAmount || platformBalance >= numericBetAmount
  const possibleWin = toLocaleString(totalOdds * numericBetAmount, { digits: 2 })

  const isSingle = items.length === 1

  const handleSubmit = async () => {
    if (!address || !isSingle) return

    const item = items[0]!
    const currentOdds = odds?.[`${item.conditionId}-${item.outcomeId}`]

    if (!currentOdds || !numericBetAmount) return

    setSubmitting(true)
    setSubmitError(null)

    analytics.trackEvent('predikt_bet_submit_clicked', {
      selections_count: items.length,
      bet_amount: numericBetAmount,
      total_odds: Number(totalOdds || 0),
      action: 'custodial_place_bet',
    })

    try {
      const res = await fetch('/api/sports/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          conditionId: item.conditionId,
          outcomeId: item.outcomeId,
          amount: numericBetAmount,
          currentOdds: Number(currentOdds),
          marketName: item.game?.title ?? undefined,
          selectionName: `${item.marketName ? item.marketName + ' — ' : ''}${item.selectionName ?? ''}`,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Bet placement failed')
      }

      analytics.trackEvent('predikt_bet_submit_success', {
        selections_count: items.length,
        bet_amount: numericBetAmount,
        total_odds: Number(totalOdds || 0),
      })

      // Refresh platform balance
      queryClient.invalidateQueries({ queryKey: [ 'platform-balance', address.toLowerCase() ] })

      openModal('SuccessModal', { title: messages.success.title })
      clear()
    }
    catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setSubmitError(errorMsg)
      analytics.trackEvent('predikt_bet_submit_failed', {
        selections_count: items.length,
        bet_amount: numericBetAmount,
        error_message: errorMsg,
      })
    }
    finally {
      setSubmitting(false)
    }
  }

  const isLoading = isOddsFetching || isMaxBetFetching || isBalanceFetching || isStatesFetching || isSubmitting

  const isDisabled = (
    isLoading
    || !address
    || !isBetAllowed
    || !isEnoughBalance
    || !numericBetAmount
    || !isSingle  // combo bets not yet supported in custodial mode
  )

  const rootClassName = cx('flex items-center justify-between py-1 pr-1 border rounded-md w-full', {
    'bg-bg-l1 border-grey-10 cursor-not-allowed': isDisabled,
    'bg-brand-50 text-grey-90 border-white/20': !isDisabled,
  })
  const possibleWinClassName = cx('text-caption-12 flex items-center p-2 rounded-sm flex-none select-none', {
    'bg-grey-15 text-grey-20': isDisabled,
    'bg-white/20 text-grey-90': !isDisabled,
  })

  return (
    <div className="space-y-3">
      {!isEnoughBalance && (
        <Warning text={messages.errors.insufficientBalance.text} />
      )}
      {submitError && (
        <Warning text={{ en: submitError }} />
      )}
      {items.length > 1 && (
        <Warning text={{ en: 'Combo bets coming soon — place single bets for now.' }} />
      )}
      <button
        className={rootClassName}
        onClick={handleSubmit}
        disabled={isDisabled}
        type="button"
      >
        <div className="w-full text-center px-1">
          {
            isLoading ? (
              <Icon className="size-4 mx-auto" name="interface/spinner" />
            ) : (
              <Message
                className="font-bold text-caption-14"
                value={buttonMessages.placeBet}
              />
            )
          }
        </div>
        <div className={possibleWinClassName}>
          <Message className="mr-1" value={messages.possibleWin} />
          <div className="font-semibold">{possibleWin} {betToken.symbol}</div>
        </div>
      </button>
    </div>
  )
}

export default BetButton
