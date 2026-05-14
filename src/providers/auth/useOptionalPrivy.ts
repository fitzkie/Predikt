'use client'

import { usePrivy, useLinkAccount } from '@privy-io/react-auth'
import { constants } from 'helpers'


type OptionalPrivyState = {
  authenticated: boolean
  ready: boolean
  connectWallet: () => void
  logout: () => Promise<void> | void
  canLogin: boolean
  linkGoogle: () => void
  linkTwitter: () => void
  isGoogleLinked: boolean
  isXLinked: boolean
}

const fallbackState: OptionalPrivyState = {
  authenticated: false,
  ready: false,
  connectWallet: () => undefined,
  logout: () => undefined,
  canLogin: false,
  linkGoogle: () => undefined,
  linkTwitter: () => undefined,
  isGoogleLinked: false,
  isXLinked: false,
}

export const useOptionalPrivy = (): OptionalPrivyState => {
  if (!constants.hasValidPrivyAppId) {
    return fallbackState
  }

  try {
    const { authenticated, ready, connectOrCreateWallet, login, logout, user } = usePrivy()
    const { linkGoogle, linkTwitter } = useLinkAccount()
    const connectWallet = typeof connectOrCreateWallet === 'function' ? connectOrCreateWallet : login

    const isGoogleLinked = user?.linkedAccounts.some(a => a.type === 'google_oauth') ?? false
    const isXLinked = user?.linkedAccounts.some(a => a.type === 'twitter_oauth') ?? false

    return {
      authenticated,
      ready,
      connectWallet,
      logout: typeof logout === 'function' ? logout : (() => undefined),
      canLogin: typeof connectWallet === 'function',
      linkGoogle: typeof linkGoogle === 'function' ? linkGoogle : () => undefined,
      linkTwitter: typeof linkTwitter === 'function' ? linkTwitter : () => undefined,
      isGoogleLinked,
      isXLinked,
    }
  }
  catch {
    return fallbackState
  }
}

export default useOptionalPrivy
