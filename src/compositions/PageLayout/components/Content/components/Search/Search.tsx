'use client'

import { Message } from '@locmod/intl'
import React, { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { openModal } from '@locmod/modal'
import { Icon } from 'components/ui'

import Controls from '../Controls/Controls'
import messages from './messages'


const PrediktsSearch: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [ value, setValue ] = useState(searchParams.get('q') || '')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value
    setValue(nextValue)

    const params = new URLSearchParams(searchParams.toString())

    if (nextValue) {
      params.set('q', nextValue)
    }
    else {
      params.delete('q')
    }

    router.replace(`/predikts?${params.toString()}`, { scroll: false })
  }

  const handleClear = () => {
    setValue('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    router.replace(`/predikts?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="h-16 w-full flex items-center gap-4 py-3 px-6 bg-bg-l0 border-b border-white/5">
      <Icon className="size-5 shrink-0 text-grey-40" name="interface/search" />
      <input
        className="flex-1 bg-transparent text-caption-13 text-grey-90 placeholder-grey-40 outline-none min-w-0"
        placeholder="Search Predikt markets..."
        value={value}
        onChange={handleChange}
      />
      {value ? (
        <button className="text-grey-60 hover:text-grey-90 shrink-0" onClick={handleClear} type="button">
          <Icon className="size-4" name="interface/clear" />
        </button>
      ) : null}
      <div className="text-caption-12 font-medium uppercase tracking-[0.18em] text-grey-60 shrink-0">
        Predikt Markets
      </div>
      <Controls />
    </div>
  )
}

const Search: React.FC = () => {
  const pathname = usePathname()
  const isPredikts = pathname.startsWith('/predikts')

  if (isPredikts) {
    return <PrediktsSearch />
  }

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
        Sports mode
      </div>
    </div>
  )
}

export default Search
