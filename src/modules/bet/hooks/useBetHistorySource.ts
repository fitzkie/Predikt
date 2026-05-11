'use client'

import { useAccount } from '@azuro-org/sdk-social-aa-connector'
import { useAzuroUserBetHistoryRaw } from 'providers/azuro'


const useBetHistorySource = () => {
  const { address } = useAccount()
  const historyQuery = useAzuroUserBetHistoryRaw(address)

  return {
    address,
    historyQuery,
    historyBets: historyQuery.data || [],
  } as const
}

export default useBetHistorySource
