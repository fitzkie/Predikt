import { useBaseBetslip, useSelectionOdds } from '@azuro-org/sdk'
import { GameState, type GameData, type MarketOutcome } from '@azuro-org/toolkit'
import { type MutableRefObject } from 'react'
import { useAnalytics } from 'providers/analytics'

import useOddsChange from 'src/hooks/useOddsChange'


type UseButtonProps = {
  marketName: string
  outcome: MarketOutcome
  game: GameData
  nodeRef: MutableRefObject<HTMLDivElement | null>
}

const useButton = (props: UseButtonProps) => {
  const { marketName, outcome, game, nodeRef } = props
  const analytics = useAnalytics()
  const hasRequiredIds = Boolean(outcome.conditionId && outcome.outcomeId)

  const { data: odds, isFetching: isOddsFetching } = useSelectionOdds({
    selection: hasRequiredIds ? outcome : {
      ...outcome,
      conditionId: '__missing_condition__',
      outcomeId: '__missing_outcome__',
    },
    initialOdds: outcome.odds,
  })

  useOddsChange({ odds, nodeRef })

  const { items, addItem, removeItem } = useBaseBetslip()

  const isActive = Boolean(items?.find((item) => {
    const propsKey = `${outcome.gameId}-${outcome.conditionId}-${outcome.outcomeId}`
    const itemKey = `${item.gameId}-${item.conditionId}-${item.outcomeId}`

    return propsKey === itemKey
  }))

  const onClick = () => {
    if (!hasRequiredIds) {
      return
    }

    const action = isActive ? 'remove' : 'add'

    analytics.trackEvent('predikt_bet_odds_clicked', {
      action,
      game_id: game.gameId,
      market_name: marketName,
      outcome_id: outcome.outcomeId,
      selection_name: outcome.selectionName,
      odds: odds ?? outcome.odds,
      is_live: game.state === GameState.Live,
    })

    if (isActive) {
      removeItem(outcome)
    }
    else {
      addItem({
        marketName,
        game,
        ...outcome,
      })
    }
  }

  return {
    odds,
    isActive,
    isOddsFetching,
    onClick,
  }
}

export default useButton
