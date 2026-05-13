'use client'

import { useMemo } from 'react'
import { useChain } from '@azuro-org/sdk'

import { useBetHistorySource } from 'modules/bet/hooks'


const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value)

    return Number.isFinite(parsedValue) ? parsedValue : 0
  }

  return 0
}

const useProfileStats = () => {
  const { betToken } = useChain()
  const { historyBets } = useBetHistorySource()

  return useMemo(() => {
    const totals = (historyBets as any[]).reduce((acc, bet) => {
      const amount = toNumber(bet?.amount)
      const payout = toNumber(bet?.payout) || toNumber(bet?.cashout?.payout)

      acc.betsCount += 1
      acc.betAmount += amount
      acc.payout += payout

      return acc
    }, {
      betsCount: 0,
      betAmount: 0,
      payout: 0,
    })

    return {
      ...totals,
      tokenSymbol: betToken.symbol,
    }
  }, [ betToken.symbol, historyBets ])
}

export default useProfileStats
