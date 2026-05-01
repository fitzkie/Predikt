'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { useWallet } from 'wallet'
import { constants } from 'helpers'

import { Button, buttonMessages } from 'components/inputs'
import TabbedBetslip from 'compositions/TabbedBetslip/TabbedBetslip'
import LiveStatistics from 'compositions/LiveStatistics/LiveStatistics'

import Controls from '../Controls/Controls'


const RightSidebar: React.FC = () => {
  const pathname = usePathname()
  const isPredikts = pathname.startsWith('/predikts')
  const { account, isReconnecting, isConnecting } = useWallet()
  const { login } = usePrivy()

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
              onClick={login}
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
              <div className="rounded-lg border border-white/10 bg-bg-l2 p-5">
                <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">Predikts flow</div>
                <div className="mt-3 text-heading-h4 font-semibold text-grey-90">Build market depth before execution</div>
                <p className="mt-3 text-caption-14 leading-6 text-grey-70">
                  Use the taxonomy to define featured categories, then connect pricing, commentary, and settlement views for each lane.
                </p>
                <Button className="mt-5 w-full" href={constants.links.prediktsApp} size={40} title="Open Predikts Hub" />
              </div>
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
