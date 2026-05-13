'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { openModal } from '@locmod/modal'
import { useWallet } from 'wallet'
import { constants } from 'helpers'
import { PrediktsPortfolioPanel } from 'modules/predikts'

import { Button, buttonMessages } from 'components/inputs'
import TabbedBetslip from 'compositions/TabbedBetslip/TabbedBetslip'
import LiveStatistics from 'compositions/LiveStatistics/LiveStatistics'

import Controls from '../Controls/Controls'


const RightSidebar: React.FC = () => {
  const pathname = usePathname()
  const isPredikts = pathname.startsWith('/predikts')
  const { account, isReconnecting, isConnecting } = useWallet()

  const handleConnect = () => {
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
              loading={isConnecting || isReconnecting}
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
                <div className="text-caption-12 uppercase tracking-[0.18em] text-grey-60">Featured lanes</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {
                    constants.prediktsTaxonomy.map((category) => (
                      <span key={category.slug} className="rounded-full border border-white/10 px-3 py-1.5 text-caption-12 text-grey-60">
                        {category.title}
                      </span>
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
