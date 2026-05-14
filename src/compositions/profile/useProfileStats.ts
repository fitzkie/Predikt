'use client'

import { useMemo } from 'react'
import { useChain, useBets } from '@azuro-org/sdk'
import { useWallet } from 'wallet'


const useProfileStats = () => {
  const { betToken } = useChain()
  const { account: address } = useWallet()

  const { data } = useBets({
    filter: {
      bettor: address!,
    },
    itemsPerPage: 1000,
  })

  const allBets = useMemo(() => data?.pages.flatMap((page) => page.bets) ?? [], [ data ])

  return useMemo(() => {
    const totals = allBets.reduce((acc, bet) => {
      acc.betsCount += 1
      acc.betAmount += Number(bet.amount ?? 0)
      acc.payout += Number(bet.payout ?? 0) + Number(bet.cashout ?? 0)

      if (bet.isWin) {
        acc.winsCount += 1
      }

      if (bet.isWin || bet.isLose) {
        acc.settledCount += 1
      }

      return acc
    }, {
      betsCount: 0,
      betAmount: 0,
      payout: 0,
      winsCount: 0,
      settledCount: 0,
    })

    const winRate = totals.settledCount > 0
      ? Math.round((totals.winsCount / totals.settledCount) * 100)
      : null

    return {
      ...totals,
      winRate,
      tokenSymbol: betToken.symbol,
    }
  }, [ allBets, betToken.symbol ])
}

export default useProfileStats
