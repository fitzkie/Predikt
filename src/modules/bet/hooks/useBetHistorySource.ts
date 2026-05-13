'use client'

import { useWallet } from 'wallet'
import { useAzuroUserBetHistoryRaw } from 'providers/azuro'


const useBetHistorySource = () => {
  const { account: address } = useWallet()
  const historyQuery = useAzuroUserBetHistoryRaw(address)

  return {
    address,
    historyQuery,
    historyBets: historyQuery.data || [],
  } as const
}

export default useBetHistorySource
