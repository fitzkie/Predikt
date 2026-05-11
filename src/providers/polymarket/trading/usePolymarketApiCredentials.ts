'use client'

import { useEffect, useState } from 'react'
import localStorage from '@locmod/local-storage'
import { constants } from 'helpers'
import { type PolymarketApiCredentials } from 'providers/polymarket/client'


const STORAGE_KEY = constants.localStorageKeys.polymarketApiCredentials

const sanitizeCredentials = (value?: Partial<PolymarketApiCredentials> | null) => {
  if (!value) {
    return null
  }

  if (!value.apiKey || !value.passphrase || !value.secret) {
    return null
  }

  return {
    apiKey: value.apiKey,
    passphrase: value.passphrase,
    secret: value.secret,
    walletAddress: value.walletAddress,
    createdAt: value.createdAt,
  } satisfies PolymarketApiCredentials
}

const usePolymarketApiCredentials = () => {
  const [ credentials, setCredentials ] = useState<PolymarketApiCredentials | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem<PolymarketApiCredentials>(STORAGE_KEY)

    setCredentials(sanitizeCredentials(stored))
  }, [])

  const saveCredentials = (value: PolymarketApiCredentials) => {
    const nextValue = {
      ...value,
      createdAt: value.createdAt || new Date().toISOString(),
    }

    localStorage.setItem(STORAGE_KEY, nextValue)
    setCredentials(nextValue)
  }

  const clearCredentials = () => {
    localStorage.removeItem(STORAGE_KEY)
    setCredentials(null)
  }

  return {
    credentials,
    hasCredentials: Boolean(credentials?.apiKey && credentials?.passphrase && credentials?.secret),
    saveCredentials,
    clearCredentials,
  } as const
}

export default usePolymarketApiCredentials
