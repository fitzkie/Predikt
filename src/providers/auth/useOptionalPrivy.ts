'use client'

import { usePrivy } from '@privy-io/react-auth'
import { constants } from 'helpers'


type OptionalPrivyState = {
  authenticated: boolean
  ready: boolean
  login: () => void
  canLogin: boolean
}

const fallbackState: OptionalPrivyState = {
  authenticated: false,
  ready: false,
  login: () => undefined,
  canLogin: false,
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
      canLogin: typeof login === 'function' && ready,
    }
  }
  catch {
    return fallbackState
  }
}

export default useOptionalPrivy
