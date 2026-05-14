'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { openModal } from '@locmod/modal'
import { useWallet } from 'wallet'
import { PrediktsPortfolioPanel, usePrediktsMarketBrowser } from 'modules/predikts'
import { useOptionalPrivy } from 'providers/auth'

import { Button, buttonMessages } from 'components/inputs'
import { Href } from 'components/navigation'
import TabbedBetslip from 'compositions/TabbedBetslip/TabbedBetslip'
import LiveStatistics from 'compositions/LiveStatistics/LiveStatistics'

import Controls from '../Controls/Controls'


const RightSidebar: React.FC = () => {
  const pathname = usePathname()
  const isPredikts = pathname.startsWith('/predikts')
  const isPrediktsHome = pathname === '/predikts'
  const { account, isReconnecting, isConnecting } = useWallet()
  const { connectWallet, canLogin, ready } = useOptionalPrivy()
  const prediktBrowser = usePrediktsMarketBrowser()

  const handleConnect = () => {
    if (canLogin && ready) {
      try {
        connectWallet()
        return
      }
      catch {}
    }

    openModal('ConnectModal')
  }

  return (
    <>
      <div className="px-6 py-3 sticky top-0 z-20">
        {
          Boolean(account) ? (
            <Controls className="ml-auto" />
          ) : (
            <Button
              className="ml-auto"
              title={buttonMessages.connectWallet}
              size={40}
              loading={isConnecting || (!ready && canLogin)}
              onClick={handleConnect}
            />
          )
        }
      </div>
      <div
        className="bg-bg-l1 border border-grey-10 rounded-r-md -ml-px overflow-auto wd:h-[calc(100vh_-_4.5rem)] no-scrollbar p-2 space-y-2"
      >
        {
          isPredikts ? (
            <div className="space-y-2">
              <PrediktsPortfolioPanel />
              <div className="rounded-lg border border-white/10 bg-bg-l2 p-5">
                <div className="text-caption-12 uppercase tracking-[0.18em] text-grey-60">Featured Markets</div>
                <div className="mt-4 space-y-3">
                  {
                    (isPrediktsHome ? prediktBrowser.trendingEvents : prediktBrowser.featuredMarkets).slice(0, 4).map((event) => (
                      <Href key={event.id} to={`/predikts/${event.slug}`} className="block rounded-md border border-white/10 bg-bg-l1 px-3 py-3 transition hover:border-white/20 hover:bg-bg-l0">
                        <div className="text-caption-13 font-semibold text-grey-90 line-clamp-2">{event.title}</div>
                        <div className="mt-2 text-caption-12 text-grey-60">
                          {event.subtitle || 'Trending market'}
                        </div>
                        <div className="mt-2 text-caption-12" style={{ color: '#9cf5bb' }}>
                          Open market
                        </div>
                      </Href>
                    ))
                  }
                </div>
              </div>
            </div>
          ) : (
            <>
              <LiveStatistics withBottomLine />
              <TabbedBetslip />
            </>
          )
        }
      </div>
    </>
  )
}

export default RightSidebar
