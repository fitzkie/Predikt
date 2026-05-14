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
  linkEmail: () => void
  isGoogleLinked: boolean
  isXLinked: boolean
  isEmailLinked: boolean
  linkedEmailAddress: string | null
}

const fallbackState: OptionalPrivyState = {
  authenticated: false,
  ready: false,
  connectWallet: () => undefined,
  logout: () => undefined,
  canLogin: false,
  linkGoogle: () => undefined,
  linkTwitter: () => undefined,
  linkEmail: () => undefined,
  isGoogleLinked: false,
  isXLinked: false,
  isEmailLinked: false,
  linkedEmailAddress: null,
}

export const useOptionalPrivy = (): OptionalPrivyState => {
  if (!constants.hasValidPrivyAppId) {
    return fallbackState
  }

  try {
    const { authenticated, ready, connectOrCreateWallet, login, logout, user } = usePrivy()
    const { linkGoogle, linkTwitter, linkEmail } = useLinkAccount({
      onError: (error) => console.error('[Privy linkAccount error]', error),
    })
    const connectWallet = typeof connectOrCreateWallet === 'function' ? connectOrCreateWallet : login

    const isGoogleLinked = user?.linkedAccounts.some(a => a.type === 'google_oauth') ?? false
    const isXLinked = user?.linkedAccounts.some(a => a.type === 'twitter_oauth') ?? false
    const emailAccount = user?.linkedAccounts.find(a => a.type === 'email') as { type: 'email'; address: string } | undefined
    const isEmailLinked = Boolean(emailAccount)
    const linkedEmailAddress = emailAccount?.address ?? null

    return {
      authenticated,
      ready,
      connectWallet,
      logout: typeof logout === 'function' ? logout : (() => undefined),
      canLogin: typeof connectWallet === 'function',
      linkGoogle: authenticated && typeof linkGoogle === 'function' ? linkGoogle : () => console.warn('[Privy] linkGoogle called but user is not authenticated'),
      linkTwitter: authenticated && typeof linkTwitter === 'function' ? linkTwitter : () => console.warn('[Privy] linkTwitter called but user is not authenticated'),
      linkEmail: typeof linkEmail === 'function' ? linkEmail : () => undefined,
      isGoogleLinked,
      isXLinked,
      isEmailLinked,
      linkedEmailAddress,
    }
  }
  catch {
    return fallbackState
  }
}

export default useOptionalPrivy
