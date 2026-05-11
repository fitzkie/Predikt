import { type AzuroClientConfig, type AzuroGraphResponse, type AzuroHistoryClient } from './types'


const BET_HISTORY_QUERY = `
  query PrediktBetHistory($wallet: String!) {
    v3Bets(where: { actor: $wallet }) {
      id
      actor
      amount
      status
      potentialPayout
      payout
      result
      odds
      settledOdds
      redeemedTxHash
      affiliate
      isRedeemed
      isRedeemable
      isCashedOut
      freebetId
      isFreebetAmountReturnable
      paymasterContractAddress
      tokenId
      createdAt
      resolvedAt
      txHash
      redeemedAt
      core {
        address
        liquidityPool {
          address
        }
      }
      cashout {
        payout
      }
      selections {
        odds
        result
        conditionKind
        outcome {
          outcomeId
          title
          condition {
            conditionId
            title
            status
            gameId
            wonOutcomeIds
          }
        }
      }
    }
  }
`

const TRANSACTIONS_QUERY = `
  query PrediktTransactions($wallet: String!) {
    transactions(where: { wallet: $wallet }) {
      id
      timestamp
      type
      amount
      hash
    }
  }
`

const postGraphQuery = async <T>(graphApiUrl: string, query: string, variables: Record<string, unknown>) => {
  const response = await fetch(graphApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Azuro graph request failed with ${response.status}`)
  }

  const payload = await response.json() as AzuroGraphResponse<T>

  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message)
  }

  return payload.data as T
}

export const createAzuroHistoryClient = (config: AzuroClientConfig): AzuroHistoryClient => {
  return {
    async getUserBetHistory(wallet: string) {
      const data = await postGraphQuery<{ v3Bets?: unknown[] }>(config.graphApiUrl, BET_HISTORY_QUERY, { wallet: wallet.toLowerCase() })

      return data?.v3Bets || []
    },

    async getUserTransactions(wallet: string) {
      const data = await postGraphQuery<{ transactions?: unknown[] }>(config.graphApiUrl, TRANSACTIONS_QUERY, { wallet: wallet.toLowerCase() })

      return data?.transactions || []
    },
  }
}
