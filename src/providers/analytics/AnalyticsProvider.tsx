'use client'

import React, { createContext, useContext, useEffect, useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'


type PrediktProduct = 'marketing' | 'bet' | 'app'

type AnalyticsPayload = Record<string, unknown>

type AnalyticsContextValue = {
  brand: 'Predikt'
  product: PrediktProduct
  hostname: string
  path: string
  trackEvent: (event: string, payload?: AnalyticsPayload) => void
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>
    __PREDIKT_ANALYTICS_CONTEXT__?: {
      brand: 'Predikt'
      product: PrediktProduct
      hostname: string
      path: string
    }
  }
}

const Context = createContext<AnalyticsContextValue | null>(null)

const getProductFromHostname = (hostname: string): PrediktProduct => {
  const normalizedHostname = hostname.toLowerCase()

  if (normalizedHostname === 'bet.prediktmarkets.com') {
    return 'bet'
  }

  if (normalizedHostname === 'app.prediktmarkets.com') {
    return 'app'
  }

  return 'marketing'
}

const pushEvent = (event: string, payload: AnalyticsPayload) => {
  if (typeof window === 'undefined') {
    return
  }

  window.dataLayer?.push({
    event,
    ...payload,
  })

  window.gtag?.('event', event, payload)

  window.dispatchEvent(new CustomEvent('predikt:analytics', {
    detail: {
      event,
      payload,
    },
  }))
}

const AnalyticsProvider: React.CFC = (props) => {
  const { children } = props
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hostname = typeof window === 'undefined' ? '' : window.location.hostname.toLowerCase()
  const search = searchParams?.toString()
  const path = `${pathname || '/'}${search ? `?${search}` : ''}`

  const value = useMemo<AnalyticsContextValue>(() => {
    const product = getProductFromHostname(hostname)

    return {
      brand: 'Predikt',
      product,
      hostname,
      path,
      trackEvent: (event, payload = {}) => {
        pushEvent(event, {
          brand: 'Predikt',
          product,
          hostname,
          path,
          ...payload,
        })
      },
    }
  }, [ hostname, path ])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.__PREDIKT_ANALYTICS_CONTEXT__ = {
      brand: value.brand,
      product: value.product,
      hostname: value.hostname,
      path: value.path,
    }

    value.trackEvent('predikt_page_view', {
      page_path: value.path,
      page_hostname: value.hostname,
    })
  }, [ value ])

  return (
    <Context.Provider value={value}>
      {children}
    </Context.Provider>
  )
}

export const useAnalytics = () => {
  const value = useContext(Context)

  if (!value) {
    throw new Error('useAnalytics must be used within AnalyticsProvider')
  }

  return value
}

export default AnalyticsProvider
