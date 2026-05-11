'use client'

import React from 'react'
import { type State } from 'wagmi'
import { WagmiProvider } from 'wallet'


type Props = {
  initialState?: State
}

const AuthProviderBoundary: React.CFC<Props> = (props) => {
  const { children, initialState } = props

  return (
    <WagmiProvider initialState={initialState}>
      {children}
    </WagmiProvider>
  )
}

export default AuthProviderBoundary
