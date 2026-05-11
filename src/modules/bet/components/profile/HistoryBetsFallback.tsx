'use client'

import React, { useMemo } from 'react'
import { BetType, useChain } from '@azuro-org/sdk'
import { Message } from '@locmod/intl'
import dayjs from 'dayjs'
import cx from 'classnames'
import { toLocaleString } from 'helpers'
import { Icon } from 'components/ui'
import EmptyContent from 'compositions/EmptyContent/EmptyContent'

import messages from 'compositions/profile/Bets/messages'
import { type NormalizedHistoryBet, filterNormalizedHistoryByTab, normalizeAzuroHistoryBet } from 'modules/bet/lib/normalizeHistory'


type Props = {
  bets: unknown[]
  tab?: BetType
}

const HistoryBetCard: React.FC<{ bet: NormalizedHistoryBet }> = ({ bet }) => {
  const { betToken, appChain } = useChain()

  const resultLabel = bet.isCashedOut
    ? messages.cashedOut
    : bet.result === 'Won'
      ? messages.winning
      : bet.result === 'Lost'
        ? messages.loss
        : messages.possibleWin

  const amountValue = bet.isCashedOut
    ? bet.cashoutPayout || '0'
    : bet.payout || bet.possibleWin

  return (
    <div className="rounded-md bg-bg-l2 px-1">
      <div className="flex items-center justify-between py-2 px-3">
        <div className="flex items-center text-caption-13">
          <Message className="font-semibold" value={bet.selections.length > 1 ? messages.combo : messages.single} />
          <div className="size-1 flex-none bg-grey-20 rounded-full mx-2" />
          {
            bet.txHash ? (
              <a
                className="flex items-center text-grey-60 hover:text-grey-90 hover:underline"
                href={`${appChain.blockExplorers!.default.url}/tx/${bet.txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                <span>{dayjs(bet.createdAt * 1000).format('DD.MM.YYYY, HH:mm')}</span>
                <Icon className="size-4 ml-1" name="interface/external_link" />
              </a>
            ) : (
              <span className="text-grey-60">{dayjs(bet.createdAt * 1000).format('DD.MM.YYYY, HH:mm')}</span>
            )
          }
        </div>
        <div className="text-caption-12 font-semibold uppercase text-brand-50">
          {bet.status || 'History'}
        </div>
      </div>
      <div className="space-y-1">
        {
          bet.selections.map((selection) => (
            <div key={`${bet.id}-${selection.conditionId}-${selection.outcomeId}`} className="rounded-sm bg-bg-l3 p-3">
              <div className="flex items-center justify-between">
                <div className="text-caption-13 font-semibold">{selection.marketName}</div>
                <div className="text-caption-12 text-grey-60">{selection.conditionStatus || 'Open'}</div>
              </div>
              <div className="mt-2 flex items-center justify-between text-caption-13">
                <div>{selection.outcomeName}</div>
                <div className="font-semibold">{toLocaleString(selection.odds || 0, { digits: 2 })}</div>
              </div>
            </div>
          ))
        }
      </div>
      <div className="flex ds:items-center ds:justify-between mb:flex-col mb:space-y-2 ds:py-4 mb:py-2 ds:px-3 mb:px-2">
        <div className="flex items-center text-caption-13 mb:justify-between">
          {
            bet.isFreebet ? (
              <div className="flex items-center text-accent-green mr-2">
                <Icon className="size-4" name="interface/gift" />
                <Message className="font-semibold uppercase ml-1" value={messages.freebet} />
              </div>
            ) : (
              <Message className="text-grey-70 mr-1" value={messages.betAmount} />
            )
          }
          <span>{toLocaleString(bet.amount, { digits: 2 })} {betToken.symbol}</span>
        </div>
        <div className="flex items-center text-caption-13 mb:justify-between">
          <Message className="text-grey-70 mr-1" value={resultLabel} />
          <span
            className={
              cx('font-semibold', {
                'text-grey-70': bet.result === 'Lost' || bet.isCashedOut,
                'text-accent-green': bet.result === 'Won' && !bet.isCashedOut,
              })
            }
          >
            {toLocaleString(amountValue, { digits: 2 })} {betToken.symbol}
          </span>
        </div>
      </div>
    </div>
  )
}

const HistoryBetsFallback: React.FC<Props> = ({ bets, tab }) => {
  const normalized = useMemo(() => {
    return filterNormalizedHistoryByTab(bets.map((bet) => normalizeAzuroHistoryBet(bet as never)), tab)
  }, [ bets, tab ])

  if (!normalized.length) {
    return (
      <EmptyContent
        className="py-20"
        image="/images/illustrations/smile_sad.png"
        title={messages.empty.title}
        text={messages.empty.text}
      />
    )
  }

  return (
    <div className="space-y-2">
      {
        normalized.map((bet) => (
          <HistoryBetCard key={bet.id} bet={bet} />
        ))
      }
    </div>
  )
}

export default HistoryBetsFallback
