'use client'

import React, { createContext, useContext, useEffect, useMemo } from 'react'

import { createPolymarketClient } from './client'
import { polymarketClientConfig } from './config'
import { createPolymarketRealtimeClient } from './realtimeClient'
import { type PolymarketClient, type PolymarketRealtimeClient } from './types'


type PolymarketServices = {
  client: PolymarketClient
  realtime: PolymarketRealtimeClient
}

const Context = createContext<PolymarketServices | null>(null)

export const PolymarketClientBoundary: React.CFC = ({ children }) => {
  const services = useMemo<PolymarketServices>(() => ({
    client: createPolymarketClient(polymarketClientConfig),
    realtime: createPolymarketRealtimeClient(polymarketClientConfig),
  }), [])

  useEffect(() => {
    services.realtime.connect()

    return () => {
      services.realtime.disconnect()
    }
  }, [ services ])

  return (
    <Context.Provider value={services}>
      {children}
    </Context.Provider>
  )
}

export const usePolymarketClient = () => {
  const value = useContext(Context)

  if (!value) {
    throw new Error('usePolymarketClient must be used within PolymarketClientBoundary')
  }

  return value.client
}

export const usePolymarketRealtime = () => {
  const value = useContext(Context)

  if (!value) {
    throw new Error('usePolymarketRealtime must be used within PolymarketClientBoundary')
  }

  return value.realtime
}
