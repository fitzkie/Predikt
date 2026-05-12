'use client'

import React, { useRef } from 'react'
import cx from 'classnames'
import { useBaseBetslip, useChain, useDetailedBetslip, useBet } from '@azuro-org/sdk'
import { type Address } from 'viem'
import { Message } from '@locmod/intl'
import { useAccount } from '@azuro-org/sdk-social-aa-connector'
import { openModal } from '@locmod/modal'
import localStorage from '@locmod/local-storage'
import { useAnalytics } from 'providers/analytics'
import { constants, isUserRejectedRequestError, toLocaleString } from 'helpers'

import { Icon } from 'components/ui'
import { Warning } from 'components/feedback'
import { buttonMessages } from 'components/inputs'

import messages from './messages'


type BetButtonProps = {
  isEnoughBalance: boolean
  isBalanceFetching: boolean
}

const getErrorConfig = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  if (isUserRejectedRequestError(error)) {
    return messages.errors.walletRejected
  }

  if (/(insufficient|balance)/i.test(message)) {
    return messages.errors.insufficientBalance
  }

  if (/(allowance|approve)/i.test(message)) {
    return messages.errors.approvalRequired
  }

  if (/(odds|slippage|price|condition state|suspend|suspended|stale)/i.test(message)) {
    return messages.errors.staleOdds
  }

  return messages.errors.generic
}

const BetButton: React.FC<BetButtonProps> = ({ isEnoughBalance, isBalanceFetching }) => {
  const analytics = useAnalytics()
  const { address } = useAccount()
  const { betToken } = useChain()
  const { items, clear } = useBaseBetslip()
  const {
    betAmount, odds, totalOdds, selectedFreebet,
    isBetAllowed, isOddsFetching, isStatesFetching, isMaxBetFetching,
  } = useDetailedBetslip()
  const totalOddsRef = useRef(totalOdds)

  if (!isOddsFetching) {
    totalOddsRef.current = totalOdds
  }

  const slippage = +(localStorage.getItem(constants.localStorageKeys.slippage) as string || constants.defaultSlippage)
  const diff = selectedFreebet && selectedFreebet.params.isSponsoredBetReturnable ? +selectedFreebet.amount : 0
  const possibleWin = toLocaleString(totalOddsRef.current * +betAmount - diff, { digits: 2 })

  const {
    submit,
    approveTx,
    betTx,
    isRelayerFeeLoading,
    isAllowanceLoading,
    isApproveRequired,
  } = useBet({
    // betAmount: isBatch ? batchBetAmounts : betAmount,
    betAmount,
    slippage,
    affiliate: process.env.NEXT_PUBLIC_AFFILIATE_ADDRESS as Address,
    selections: items,
    odds,
    totalOdds,
    freebet: selectedFreebet,
    onSuccess: () => {
      analytics.trackEvent('predikt_bet_submit_success', {
        selections_count: items.length,
        bet_amount: Number(betAmount || 0),
        total_odds: Number(totalOddsRef.current || 0),
        approval_required: isApproveRequired,
        freebet_selected: Boolean(selectedFreebet),
      })
      openModal('SuccessModal', {
        title: messages.success.title,
      })
      clear()
    },
      onError: (err) => {
      analytics.trackEvent('predikt_bet_submit_failed', {
        selections_count: items.length,
        bet_amount: Number(betAmount || 0),
        total_odds: Number(totalOddsRef.current || 0),
        approval_required: isApproveRequired,
        freebet_selected: Boolean(selectedFreebet),
        rejected_by_user: isUserRejectedRequestError(err),
        error_message: err instanceof Error ? err.message : String(err),
      })
      const errorConfig = getErrorConfig(err)

      openModal('ErrorModal', {
        title: errorConfig.title,
        text: errorConfig.text,
      })

      console.log('Bet err:', err)
    },
  })

  const isPending = approveTx.isPending || betTx.isPending
  const isProcessing = approveTx.isProcessing || betTx.isProcessing

  const isLoading = (
    isOddsFetching
    || isMaxBetFetching
    || isBalanceFetching
    || isStatesFetching
    || isAllowanceLoading
    || isPending
    || isProcessing
    || isRelayerFeeLoading
  )

  const isDisabled = (
    isLoading
    || !address
    || !isBetAllowed
    || (!isEnoughBalance && !isApproveRequired)
    || (!+betAmount && !selectedFreebet)
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
      {
        isApproveRequired && (
          <Warning text={messages.errors.approvalRequired.text} />
        )
      }
      <button
        className={rootClassName}
        onClick={() => {
          analytics.trackEvent('predikt_bet_submit_clicked', {
            selections_count: items.length,
            bet_amount: Number(betAmount || 0),
            total_odds: Number(totalOddsRef.current || 0),
            action: isApproveRequired ? 'approve' : 'place_bet',
            freebet_selected: Boolean(selectedFreebet),
          })
          void submit()
        }}
        disabled={isDisabled}
      >
        <div className="w-full text-center px-1">
          {
            isLoading ? (
              <Icon className="size-4 mx-auto" name="interface/spinner" />
            ) : (
              <Message
                className="font-bold text-caption-14"
                value={isApproveRequired ? buttonMessages.approve : buttonMessages.placeBet}
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
