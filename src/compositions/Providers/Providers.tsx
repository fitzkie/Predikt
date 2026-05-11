'use client'

import React from 'react'
import { type State } from 'wagmi'
import { type ChainId } from '@azuro-org/toolkit'
import { IntlProvider } from '@locmod/intl'
import { SvgProvider, SvgSprite } from 'svg-provider'
import { DeviceProvider, OddsViewProvider } from 'contexts'
import { AnalyticsProvider } from 'providers/analytics'
import { AuthProviderBoundary } from 'providers/auth'
import { AzuroAppProvider } from 'providers/azuro'
import { PolymarketAppProvider } from 'providers/polymarket'

import NewFreeBetsChecker from 'compositions/NewFreeBetsChecker/NewFreeBetsChecker'


type Props = {
  userAgent: string
  initialChainId: ChainId
  initialLiveState: boolean
  initialState?: State
}


const Providers: React.CFC<Props> = (props) => {
  const { children, userAgent, initialState, initialChainId, initialLiveState } = props

  return (
    <DeviceProvider userAgent={userAgent}>
      <SvgProvider>
        <IntlProvider locale="en">
          <AnalyticsProvider>
            <AuthProviderBoundary initialState={initialState}>
              <AzuroAppProvider initialChainId={initialChainId} initialLiveState={initialLiveState}>
                <PolymarketAppProvider>
                  <OddsViewProvider>
                    {children}
                  </OddsViewProvider>
                </PolymarketAppProvider>
                <NewFreeBetsChecker />
              </AzuroAppProvider>
            </AuthProviderBoundary>
          </AnalyticsProvider>
        </IntlProvider>
        <div className="sr-only">
          <SvgSprite />
        </div>
      </SvgProvider>
    </DeviceProvider>
  )
}

export default Providers
