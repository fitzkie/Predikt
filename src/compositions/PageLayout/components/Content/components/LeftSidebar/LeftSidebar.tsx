'use client'

import React from 'react'
import { usePathname } from 'next/navigation'

import { Logo } from 'components/ui'
import Navigation from 'compositions/Navigation/Navigation'
import LiveSwitcher from 'compositions/LiveSwitcher/LiveSwitcher'

import AppModeTabs from 'compositions/app/AppModeTabs/AppModeTabs'
import PrediktsSidebar from 'compositions/app/PrediktsSidebar/PrediktsSidebar'


const LeftSidebar: React.FC = () => {
  const pathname = usePathname()
  const isPredikts = pathname.startsWith('/predikts')

  return (
    <div className="h-full">
      <div className="px-4 py-5 sticky top-0 bg-bg-l0/95 backdrop-blur">
        <Logo className="h-6" />
        <AppModeTabs className="mt-5" />
      </div>
      <div className="overflow-auto wd:h-[calc(100vh_-_4rem)] no-scrollbar">
        {
          isPredikts ? (
            <PrediktsSidebar />
          ) : (
            <>
              <LiveSwitcher />
              <Navigation className="mt-2" />
            </>
          )
        }
      </div>
    </div>
  )
}

export default LeftSidebar
