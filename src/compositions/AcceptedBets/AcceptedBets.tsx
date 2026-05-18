'use client'

import React from 'react'
import { Message } from '@locmod/intl'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import cx from 'classnames'
import { useWallet } from 'wallet'

import { Button } from 'components/inputs'
import EmptyContentComp from 'compositions/EmptyContent/EmptyContent'

import messages from './messages'


type DbSportsBet = {
  id: string
  marketName: string | null
  selectionName: string | null
  amount: number
  potentialPayout: number
  odds: number
  status: string
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400',
  won: 'text-accent-green',
  lost: 'text-grey-50',
  refunded: 'text-grey-60',
  failed: 'text-accent-red',
}

const EmptyContent: React.FC = () => (
  <EmptyContentComp
    className="py-6"
    image="/images/illustrations/smile_sad.png"
    title={messages.empty.title}
    text={messages.empty.text}
  />
)

const AcceptedBets: React.FC = () => {
  const { account: address } = useWallet()

  const { data, isLoading } = useQuery<DbSportsBet[]>({
    queryKey: [ 'sports', 'bets', 'sidebar', address?.toLowerCase() ],
    queryFn: async () => {
      const r = await fetch(`/api/sports/bets?address=${address}`)
      if (!r.ok) return []
      const json = await r.json()
      return (json.bets ?? []).filter((b: DbSportsBet) => b.status === 'pending')
    },
    enabled: Boolean(address),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return <div className="bone rounded-sm h-[7.75rem] w-full" />
  }

  if (!data?.length) {
    return <EmptyContent />
  }

  return (
    <>
      <div className="p-3">
        <span className="text-caption-14 font-semibold">
          {data.length} pending {data.length === 1 ? 'bet' : 'bets'}
        </span>
      </div>
      <div className="space-y-2 max-h-[28rem] overflow-auto no-scrollbar px-1">
        {data.map((bet) => {
          const statusColor = STATUS_COLORS[bet.status] ?? 'text-grey-60'
          const date = dayjs(bet.createdAt).format('DD MMM, HH:mm')

          return (
            <div key={bet.id} className="rounded-md bg-bg-l2 px-3 py-2 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <span className="text-caption-13 font-semibold text-grey-90 leading-snug line-clamp-2">
                  {bet.marketName ?? 'Sports Bet'}
                </span>
                <span className={cx('flex-none text-caption-11 font-semibold capitalize', statusColor)}>
                  {bet.status}
                </span>
              </div>
              {bet.selectionName && (
                <div className="text-caption-12 text-grey-60">{bet.selectionName}</div>
              )}
              <div className="flex items-center justify-between text-caption-12 pt-0.5">
                <span className="text-grey-60">{date} · <span className="text-grey-90">@{bet.odds.toFixed(2)}</span></span>
              </div>
              <div className="flex items-center justify-between text-caption-12">
                <span className="text-grey-60">Stake <span className="text-grey-90 font-semibold">${bet.amount.toFixed(2)}</span></span>
                <span className="text-grey-60">To win <span className="text-grey-90 font-semibold">${bet.potentialPayout.toFixed(2)}</span></span>
              </div>
            </div>
          )
        })}
      </div>
      <Button
        className="w-full mt-3"
        to="/profile"
        style="tertiary"
        title={messages.allBets}
        size={40}
      />
    </>
  )
}

export default AcceptedBets
