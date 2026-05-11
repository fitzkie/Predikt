import { BetType } from '@azuro-org/sdk'


type RawOutcomeCondition = {
  conditionId?: string
  title?: string | null
  status?: string | null
  gameId?: string | null
  wonOutcomeIds?: string[] | null
}

type RawOutcome = {
  outcomeId?: string
  title?: string | null
  condition?: RawOutcomeCondition | null
}

type RawSelection = {
  odds?: string
  result?: string | null
  conditionKind?: string | null
  outcome?: RawOutcome | null
}

type RawCashout = {
  payout?: string | null
}

type RawHistoryBet = {
  id: string
  tokenId?: string
  txHash?: string | null
  amount?: string
  odds?: string
  potentialPayout?: string
  payout?: string | null
  createdAt?: string
  resolvedAt?: string | null
  status?: string | null
  result?: string | null
  isRedeemed?: boolean
  isRedeemable?: boolean
  isCashedOut?: boolean
  freebetId?: string | null
  cashout?: RawCashout | null
  selections?: RawSelection[]
}

export type NormalizedHistorySelection = {
  outcomeId: string
  conditionId: string
  marketName: string
  outcomeName: string
  odds: number
  result: string | null
  gameId: string | null
  conditionStatus: string | null
}

export type NormalizedHistoryBet = {
  id: string
  tokenId: string
  txHash: string | null
  amount: string
  odds: number
  possibleWin: string
  payout: string | null
  cashoutPayout: string | null
  createdAt: number
  resolvedAt: number | null
  status: string | null
  result: string | null
  isRedeemed: boolean
  isRedeemable: boolean
  isCashedOut: boolean
  isFreebet: boolean
  selections: NormalizedHistorySelection[]
}

const parseNumber = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') {
    return 0
  }

  return Number(value)
}

export const normalizeAzuroHistoryBet = (bet: RawHistoryBet): NormalizedHistoryBet => {
  return {
    id: bet.id,
    tokenId: bet.tokenId || bet.id,
    txHash: bet.txHash || null,
    amount: bet.amount || '0',
    odds: parseNumber(bet.odds),
    possibleWin: bet.potentialPayout || '0',
    payout: bet.payout || null,
    cashoutPayout: bet.cashout?.payout || null,
    createdAt: parseNumber(bet.createdAt),
    resolvedAt: bet.resolvedAt ? parseNumber(bet.resolvedAt) : null,
    status: bet.status || null,
    result: bet.result || null,
    isRedeemed: Boolean(bet.isRedeemed),
    isRedeemable: Boolean(bet.isRedeemable),
    isCashedOut: Boolean(bet.isCashedOut),
    isFreebet: Boolean(bet.freebetId),
    selections: (bet.selections || []).map((selection) => ({
      outcomeId: selection.outcome?.outcomeId || '',
      conditionId: selection.outcome?.condition?.conditionId || '',
      marketName: selection.outcome?.condition?.title || 'Market',
      outcomeName: selection.outcome?.title || 'Outcome',
      odds: parseNumber(selection.odds),
      result: selection.result || null,
      gameId: selection.outcome?.condition?.gameId || null,
      conditionStatus: selection.outcome?.condition?.status || null,
    })),
  }
}

export const filterNormalizedHistoryByTab = (bets: NormalizedHistoryBet[], tab?: BetType) => {
  if (!tab) {
    return bets
  }

  return bets.filter((bet) => {
    if (tab === BetType.CashedOut) {
      return bet.isCashedOut
    }

    if (tab === BetType.Settled) {
      return bet.result === 'Won' || bet.result === 'Lost' || bet.result === 'Canceled'
    }

    if (tab === BetType.Unredeemed) {
      return bet.isRedeemable && !bet.isRedeemed
    }

    if (tab === BetType.Accepted) {
      return !bet.isCashedOut && !bet.isRedeemed && !bet.result
    }

    return true
  })
}
