'use client'

import React from 'react'

import { PolymarketClientBoundary } from './client'
import { PolymarketTradingBoundary } from './trading'


type Props = {
  enabled?: boolean
}

const PolymarketAppProvider: React.CFC<Props> = (props) => {
  const { children } = props

  return (
    <PolymarketClientBoundary>
      <PolymarketTradingBoundary>
        {children}
      </PolymarketTradingBoundary>
    </PolymarketClientBoundary>
  )
}

export default PolymarketAppProvider
