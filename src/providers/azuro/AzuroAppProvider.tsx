'use client'

import React from 'react'
import { type ChainId } from '@azuro-org/toolkit'
import { type Address } from 'viem'
import { AzuroSDKProvider, LiveProvider } from '@azuro-org/sdk'
import { constants } from 'helpers'

import { AzuroClientBoundary } from './client/AzuroClientContext'


type Props = {
  initialChainId: ChainId
  initialLiveState: boolean
}

const AzuroAppProvider: React.CFC<Props> = (props) => {
  const { children, initialChainId, initialLiveState } = props

  return (
    <AzuroClientBoundary>
      <AzuroSDKProvider initialChainId={initialChainId} affiliate={constants.affiliateAddress as Address}>
        <LiveProvider initialLiveState={initialLiveState}>
          {children}
        </LiveProvider>
      </AzuroSDKProvider>
    </AzuroClientBoundary>
  )
}

export default AzuroAppProvider
