'use client'

import React, { createContext, useContext, useEffect, useMemo } from 'react'

import { azuroClientConfig } from './config'
import { createAzuroFeedClient } from './feedClient'
import { createAzuroHistoryClient } from './historyClient'
import { createAzuroRealtimeClient } from './realtimeClient'
import { type AzuroFeedClient, type AzuroHistoryClient, type AzuroRealtimeClient } from './types'


type AzuroClients = {
  feed: AzuroFeedClient
  history: AzuroHistoryClient
  realtime: AzuroRealtimeClient
}

const Context = createContext<AzuroClients | null>(null)

export const AzuroClientBoundary: React.CFC = ({ children }) => {
  const clients = useMemo<AzuroClients>(() => {
    return {
      feed: createAzuroFeedClient(azuroClientConfig),
      history: createAzuroHistoryClient(azuroClientConfig),
      realtime: createAzuroRealtimeClient(azuroClientConfig),
    }
  }, [])

  useEffect(() => {
    clients.realtime.connect()

    return () => {
      clients.realtime.disconnect()
    }
  }, [ clients ])

  return (
    <Context.Provider value={clients}>
      {children}
    </Context.Provider>
  )
}

export const useAzuroClients = () => {
  const value = useContext(Context)

  if (!value) {
    throw new Error('useAzuroClients must be used within AzuroClientBoundary')
  }

  return value
}
