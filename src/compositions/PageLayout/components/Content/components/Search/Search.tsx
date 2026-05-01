'use client'

import { Message } from '@locmod/intl'
import React from 'react'
import { usePathname } from 'next/navigation'
import { openModal } from '@locmod/modal'
import { Icon } from 'components/ui'

import messages from './messages'


const Search: React.FC = () => {
  const pathname = usePathname()
  const isPredikts = pathname.startsWith('/predikts')

  return (
    <div
      className="h-16 w-full flex items-center justify-between text-grey-40 hover:text-grey-90 py-3 px-6 bg-bg-l0 cursor-pointer border-b border-white/5"
      onClick={() => openModal('SearchModal')}
    >
      <div className="flex items-center">
        <Icon className="size-5 mr-2" name="interface/search" />
        <Message className="text-caption-13" value={messages.title} />
      </div>
      <div className="text-caption-12 font-medium uppercase tracking-[0.18em] text-grey-60">
        {isPredikts ? 'Prediction mode' : 'Sports mode'}
      </div>
    </div>
  )
}

export default Search
