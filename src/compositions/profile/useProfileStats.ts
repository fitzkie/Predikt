'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useChain, useBets } from '@azuro-org/sdk'
import { useWallet } from 'wallet'


type DbOrder = {
  id: string
  tokenId: string
  side: string
  amount: string
  price: number
  status: string
}

const isMatched = (s: string) => s.toLowerCase() === 'matched'

const useProfileStats = () => {
  const { betToken } = useChain()
  const { account: address } = useWallet()

  const { data } = useBets({
    filter: {
      bettor: address!,
    },
    itemsPerPage: 1000,
  })

  const { data: prediktsOrders = [] } = useQuery<DbOrder[]>({
    queryKey: [ 'predikts', 'orders', 'user', address?.toLowerCase() ],
    queryFn: async () => {
      const r = await fetch(`/api/predikts/orders?userAddress=${address}`)
      if (!r.ok) return []
      return r.json()
    },
    enabled: Boolean(address),
    staleTime: 30_000,
  })

  const allBets = useMemo(() => data?.pages.flatMap((page) => page.bets) ?? [], [ data ])

  return useMemo(() => {
    // Sports totals from Azuro
    const sports = allBets.reduce((acc, bet) => {
      acc.betsCount += 1
      acc.betAmount += Number(bet.amount ?? 0)
      acc.payout += Number(bet.payout ?? 0) + Number(bet.cashout ?? 0)
      if (bet.isWin) acc.winsCount += 1
      if (bet.isWin || bet.isLose) acc.settledCount += 1
      return acc
    }, { betsCount: 0, betAmount: 0, payout: 0, winsCount: 0, settledCount: 0 })

    // Predikts totals from DB
    // BUY orders: count as bets and add to bet amount (amount = USD spent)
    // SELL orders: add proceeds (shares × price) to payout
    const predikts = prediktsOrders.reduce((acc, order) => {
      if (!isMatched(order.status)) return acc

      if (order.side === 'BUY') {
        acc.betsCount += 1
        acc.betAmount += Number(order.amount)
      }
      else {
        // SELL: amount = shares sold, proceeds = shares × price
        acc.payout += Number(order.amount) * order.price
      }

      return acc
    }, { betsCount: 0, betAmount: 0, payout: 0 })

    const winRate = sports.settledCount > 0
      ? Math.round((sports.winsCount / sports.settledCount) * 100)
      : null

    return {
      betsCount: sports.betsCount + predikts.betsCount,
      betAmount: sports.betAmount + predikts.betAmount,
      payout: sports.payout + predikts.payout,
      winRate,
      tokenSymbol: betToken.symbol,
    }
  }, [ allBets, prediktsOrders, betToken.symbol ])
}

export default useProfileStats
