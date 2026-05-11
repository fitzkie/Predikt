'use client'

import { useEffect, useMemo, useState } from 'react'
import { ConditionState, type GameMarkets } from '@azuro-org/toolkit'

import useBetConditionsState from './useBetConditionsState'


type ActiveMarketResult = {
  states: Record<string, ConditionState>
  marketsByKey: Record<string, GameMarkets[number]>
  activeMarketKey?: string
  activeConditionIndex: number
  otherMarkets: string[]
  sortedMarketKeys: string[]
}

const findFirstActiveCondition = (data: ActiveMarketResult) => {
  const { sortedMarketKeys, marketsByKey, states } = data

  for (const marketKey of sortedMarketKeys) {
    const market = marketsByKey[marketKey]

    for (let index = 0; index < market.conditions.length; index += 1) {
      const condition = market.conditions[index]
      const state = states[condition.conditionId] || condition.state

      if (state === ConditionState.Active) {
        return {
          marketKey,
          conditionIndex: index,
        }
      }
    }
  }

  return {
    marketKey: sortedMarketKeys[0],
    conditionIndex: 0,
  }
}

const useBetActiveMarket = ({ markets }: { markets?: GameMarkets }) => {
  const initialMarketData = useMemo(() => {
    const sortedMarketKeys = (markets || []).map((market) => market.marketKey)
    const marketsByKey = (markets || []).reduce<Record<string, GameMarkets[number]>>((accumulator, market) => {
      accumulator[market.marketKey] = market

      return accumulator
    }, {})
    const initialStates = (markets || []).reduce<Record<string, ConditionState>>((accumulator, market) => {
      market.conditions.forEach((condition) => {
        accumulator[condition.conditionId] = condition.state
      })

      return accumulator
    }, {})

    return {
      sortedMarketKeys,
      marketsByKey,
      initialStates,
    }
  }, [ markets ])

  const [ activeMarketKey, setActiveMarketKey ] = useState<string | undefined>(initialMarketData.sortedMarketKeys[0])
  const [ activeConditionIndex, setActiveConditionIndex ] = useState(0)

  const { data: states = initialMarketData.initialStates, isFetching } = useBetConditionsState({
    conditionIds: Object.keys(initialMarketData.initialStates),
    initialStates: initialMarketData.initialStates,
  })

  useEffect(() => {
    if (!initialMarketData.sortedMarketKeys.length) {
      setActiveMarketKey(undefined)
      setActiveConditionIndex(0)
      return
    }

    const nextSelection = findFirstActiveCondition({
      states,
      marketsByKey: initialMarketData.marketsByKey,
      activeConditionIndex,
      activeMarketKey,
      otherMarkets: [],
      sortedMarketKeys: initialMarketData.sortedMarketKeys,
    })

    setActiveMarketKey(nextSelection.marketKey)
    setActiveConditionIndex(nextSelection.conditionIndex)
  }, [ activeConditionIndex, activeMarketKey, initialMarketData.marketsByKey, initialMarketData.sortedMarketKeys, states ])

  const otherMarkets = useMemo(() => {
    return initialMarketData.sortedMarketKeys.filter((marketKey) => marketKey !== activeMarketKey)
  }, [ activeMarketKey, initialMarketData.sortedMarketKeys ])

  return {
    data: {
      states,
      marketsByKey: initialMarketData.marketsByKey,
      activeMarketKey,
      activeConditionIndex,
      otherMarkets,
      sortedMarketKeys: initialMarketData.sortedMarketKeys,
    },
    isFetching,
  } as const
}

export default useBetActiveMarket
