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

type Withdrawal = {
  id: string
  source: string
  amountUsd: string
  token: string
  status: string
  createdAt: string
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

  const { data: withdrawalData } = useQuery<{ withdrawals: Withdrawal[]; totalCompleted: number }>({
    queryKey: [ 'account', 'withdrawals', address?.toLowerCase() ],
    queryFn: async () => {
      const r = await fetch(`/api/account/withdraw?address=${address}`)
      if (!r.ok) return { withdrawals: [], totalCompleted: 0 }
      return r.json()
    },
    enabled: Boolean(address),
    staleTime: 30_000,
  })

  const allBets = useMemo(() => data?.pages.flatMap((page) => page.bets) ?? [], [ data ])

  return useMemo(() => {
    // Sports totals from Azuro (bet count + bet amount only; payout via withdrawals)
    const sports = allBets.reduce((acc, bet) => {
      acc.betsCount += 1
      acc.betAmount += Number(bet.amount ?? 0)
      if (bet.isWin) acc.winsCount += 1
      if (bet.isWin || bet.isLose) acc.settledCount += 1
      return acc
    }, { betsCount: 0, betAmount: 0, winsCount: 0, settledCount: 0 })

    // Predikts: count matched BUY orders + their USD amount
    const predikts = prediktsOrders.reduce((acc, order) => {
      if (!isMatched(order.status) || order.side !== 'BUY') return acc
      acc.betsCount += 1
      acc.betAmount += Number(order.amount)
      return acc
    }, { betsCount: 0, betAmount: 0 })

    // Payout = actual completed withdrawals (money that left the platform to the user's wallet)
    const payout = withdrawalData?.totalCompleted ?? 0

    const winRate = sports.settledCount > 0
      ? Math.round((sports.winsCount / sports.settledCount) * 100)
      : null

    return {
      betsCount: sports.betsCount + predikts.betsCount,
      betAmount: sports.betAmount + predikts.betAmount,
      payout,
      winRate,
      tokenSymbol: betToken.symbol,
    }
  }, [ allBets, prediktsOrders, withdrawalData, betToken.symbol ])
}

export default useProfileStats
