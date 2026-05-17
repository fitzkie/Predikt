'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import localStorage from '@locmod/local-storage'
import { useWallet } from 'wallet'
import { constants } from 'helpers'


type LinkedAccounts = {
  email: string
  google: boolean
  x: boolean
}

export type PrediktUserProfile = {
  displayName: string
  avatarDataUrl: string | null
  memberSince: string
  referralCode: string
  linkedAccounts: LinkedAccounts
}

type StoredProfiles = Record<string, PrediktUserProfile>

type PrediktUserContextValue = {
  profile: PrediktUserProfile
  isHydrated: boolean
  account?: string
  referralLink: string
  updateProfile: (patch: Partial<Pick<PrediktUserProfile, 'displayName' | 'avatarDataUrl'>>) => void
  setLinkedEmail: (email: string) => void
  toggleLinkedAccount: (provider: 'google' | 'x') => void
}

const defaultLinkedAccounts: LinkedAccounts = {
  email: '',
  google: false,
  x: false,
}

const guestProfile: PrediktUserProfile = {
  displayName: 'Predikt Guest',
  avatarDataUrl: null,
  memberSince: new Date().toISOString(),
  referralCode: 'predikt-guest',
  linkedAccounts: defaultLinkedAccounts,
}

const PrediktUserContext = createContext<PrediktUserContextValue>({
  profile: guestProfile,
  isHydrated: false,
  account: undefined,
  referralLink: `${constants.baseUrl}?invite=${guestProfile.referralCode}`,
  updateProfile: () => undefined,
  setLinkedEmail: () => undefined,
  toggleLinkedAccount: () => undefined,
})

const adjectives = [ 'Signal', 'Golden', 'Prime', 'Sharp', 'Atlas', 'Cinder', 'Nova', 'Summit' ]
const nouns = [ 'Trader', 'Scout', 'Pilot', 'Maker', 'Falcon', 'Voyager', 'Captain', 'Analyst' ]

const hashValue = (value: string) => {
  return value.split('').reduce((acc, char, index) => {
    return acc + char.charCodeAt(0) * (index + 1)
  }, 0)
}

const createDefaultProfile = (account: string): PrediktUserProfile => {
  const normalizedAccount = account.toLowerCase()
  const hash = hashValue(normalizedAccount)
  const adjective = adjectives[hash % adjectives.length]
  const noun = nouns[(hash * 7) % nouns.length]
  const numericSuffix = String(hash % 1000).padStart(3, '0')

  return {
    displayName: `${adjective} ${noun} ${numericSuffix}`,
    avatarDataUrl: null,
    memberSince: new Date().toISOString(),
    referralCode: `p${normalizedAccount.slice(2, 8)}${normalizedAccount.slice(-4)}`,
    linkedAccounts: defaultLinkedAccounts,
  }
}

export const PrediktUserProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { account } = useWallet()
  const [ profiles, setProfiles ] = useState<StoredProfiles>({})
  const [ isHydrated, setHydrated ] = useState(false)

  const normalizedAccount = account?.toLowerCase()

  useEffect(() => {
    const storedProfiles = localStorage.getItem<StoredProfiles>(constants.localStorageKeys.prediktUserProfiles)

    if (storedProfiles && typeof storedProfiles === 'object') {
      setProfiles(storedProfiles)
    }

    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated || !normalizedAccount) {
      return
    }

    setProfiles((currentProfiles) => {
      if (currentProfiles[normalizedAccount]) {
        return currentProfiles
      }

      return {
        ...currentProfiles,
        [normalizedAccount]: createDefaultProfile(normalizedAccount),
      }
    })

    // Ensure a unique custodial deposit address exists for this user.
    // Fire-and-forget — also prefunds with MATIC on first creation.
    fetch(`/api/user/deposit-address?address=${normalizedAccount}`).catch(() => {})
  }, [ isHydrated, normalizedAccount ])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    localStorage.setItem(constants.localStorageKeys.prediktUserProfiles, profiles)
  }, [ isHydrated, profiles ])

  const profile = normalizedAccount ? (profiles[normalizedAccount] || createDefaultProfile(normalizedAccount)) : guestProfile
  const referralLink = `${constants.baseUrl}?invite=${profile.referralCode}`

  const updateProfile = (patch: Partial<Pick<PrediktUserProfile, 'displayName' | 'avatarDataUrl'>>) => {
    if (!normalizedAccount) {
      return
    }

    setProfiles((currentProfiles) => ({
      ...currentProfiles,
      [normalizedAccount]: {
        ...(currentProfiles[normalizedAccount] || createDefaultProfile(normalizedAccount)),
        ...patch,
      },
    }))
  }

  const setLinkedEmail = (email: string) => {
    if (!normalizedAccount) {
      return
    }

    setProfiles((currentProfiles) => {
      const nextProfile = currentProfiles[normalizedAccount] || createDefaultProfile(normalizedAccount)

      return {
        ...currentProfiles,
        [normalizedAccount]: {
          ...nextProfile,
          linkedAccounts: {
            ...nextProfile.linkedAccounts,
            email: email.trim(),
          },
        },
      }
    })
  }

  const toggleLinkedAccount = (provider: 'google' | 'x') => {
    if (!normalizedAccount) {
      return
    }

    setProfiles((currentProfiles) => {
      const nextProfile = currentProfiles[normalizedAccount] || createDefaultProfile(normalizedAccount)

      return {
        ...currentProfiles,
        [normalizedAccount]: {
          ...nextProfile,
          linkedAccounts: {
            ...nextProfile.linkedAccounts,
            [provider]: !nextProfile.linkedAccounts[provider],
          },
        },
      }
    })
  }

  const value = useMemo(() => ({
    profile,
    isHydrated,
    account,
    referralLink,
    updateProfile,
    setLinkedEmail,
    toggleLinkedAccount,
  }), [ account, isHydrated, profile, referralLink ])

  return (
    <PrediktUserContext.Provider value={value}>
      {children}
    </PrediktUserContext.Provider>
  )
}

export const usePrediktUser = () => {
  return useContext(PrediktUserContext)
}

export default PrediktUserProvider
