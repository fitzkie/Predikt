'use client'

import { useEffect, useState } from 'react'
import { useWallet } from 'wallet'
import { useRouter } from 'next/navigation'
import cx from 'classnames'

import Bets from 'compositions/profile/Bets/Bets'
import PrediktsBets from 'compositions/profile/PrediktsBets/PrediktsBets'
import User from 'compositions/profile/User/User'


const betTabs = [
  { label: 'Sports', value: 'sports' },
  { label: 'Predictions', value: 'predictions' },
] as const

type BetTab = typeof betTabs[number]['value']

export default function ProfilePage() {
  const { account, isConnecting, isReconnecting } = useWallet()
  const router = useRouter()
  const [ betTab, setBetTab ] = useState<BetTab>('sports')

  useEffect(() => {
    if (!isConnecting && !isReconnecting && !account) {
      router.push('/')
    }
  }, [ isConnecting, isReconnecting, account ])

  if (!account) {
    return null
  }

  return (
    <>
      <User />
      <div className="flex items-center space-x-2 px-3">
        {betTabs.map(({ label, value }) => (
          <button
            key={value}
            className={cx('flex items-center p-1 cursor-pointer text-caption-13 font-semibold', {
              'text-grey-60 hover:text-grey-90': betTab !== value,
              'text-grey-90': betTab === value,
            })}
            onClick={() => setBetTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {betTab === 'sports' ? <Bets /> : <PrediktsBets />}
    </>
  )
}
