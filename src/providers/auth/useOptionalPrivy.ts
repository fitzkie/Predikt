'use client'

import { usePrivy } from '@privy-io/react-auth'
import { constants } from 'helpers'


type OptionalPrivyState = {
  authenticated: boolean
  ready: boolean
  login: () => void
}

const fallbackState: OptionalPrivyState = {
  authenticated: false,
  ready: false,
  login: () => undefined,
}

export const useOptionalPrivy = (): OptionalPrivyState => {
  if (!constants.hasValidPrivyAppId) {
    return fallbackState
  }

  try {
    const { authenticated, ready, login } = usePrivy()

    return {
      authenticated,
      ready,
      login,
    }
  }
  catch {
    return fallbackState
  }
}

export default useOptionalPrivy
