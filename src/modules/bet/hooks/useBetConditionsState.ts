'use client'

import { useConditionsState, type UseConditionsStateProps } from '@azuro-org/sdk'
import { useMemo } from 'react'


const useBetConditionsState = (props: UseConditionsStateProps) => {
  const queryOptions = (props as UseConditionsStateProps & { query?: { enabled?: boolean } }).query
  const conditionIds = useMemo(() => props.conditionIds?.filter(Boolean) || [], [ props.conditionIds ])
  const shouldQuery = conditionIds.length > 0

  const query = useConditionsState({
    ...props,
    conditionIds,
    query: {
      ...(queryOptions || {}),
      enabled: shouldQuery && (queryOptions?.enabled ?? true),
    },
  } as any)

  if (!shouldQuery) {
    return {
      ...query,
      data: props.initialStates || {},
      isFetching: false,
      isLoading: false,
    }
  }

  return query
}

export default useBetConditionsState
