'use client'

import { usePrivy } from '@privy-io/react-auth'
import { constants } from 'helpers'


type OptionalPrivyState = {
  authenticated: boolean
  ready: boolean
  connectWallet: () => void
  canLogin: boolean
}

const fallbackState: OptionalPrivyState = {
  authenticated: false,
  ready: false,
  connectWallet: () => undefined,
  canLogin: false,
}

export const useOptionalPrivy = (): OptionalPrivyState => {
  if (!constants.hasValidPrivyAppId) {
    return fallbackState
  }

  try {
    const { authenticated, ready, connectOrCreateWallet, login } = usePrivy()
    const connectWallet = typeof connectOrCreateWallet === 'function' ? connectOrCreateWallet : login

    return {
      authenticated,
      ready,
      connectWallet,
      canLogin: typeof connectWallet === 'function',
    }
  }
  catch {
    return fallbackState
  }
}

export default useOptionalPrivy
