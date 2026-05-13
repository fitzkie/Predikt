'use client'

import React, { useState } from 'react'
import { useChain } from '@azuro-org/sdk'
import { useDisconnect } from 'wagmi'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'
import cx from 'classnames'
import { useIsMounted } from 'hooks'
import { openModal } from '@locmod/modal'
import { useWallet } from 'wallet'
import { useOptionalPrivy } from 'providers/auth'
import { usePrediktUser } from 'providers/user'
import { constants, shortenAddress } from 'helpers'

import { ProfileAvatar } from 'components/dataDisplay'
import { Icon } from 'components/ui'
import { Href } from 'components/navigation'
import { Dropdown } from 'components/inputs'


const Content: React.FC = () => {
  const { account: address } = useWallet()
  const { disconnect } = useDisconnect()
  const { logout, authenticated } = useOptionalPrivy()
  const { appChain } = useChain()
  const { profile } = usePrediktUser()
  const [ isCopied, setCopied ] = useState(false)
  const isMounted = useIsMounted()

  const linkedAccounts = [
    profile.linkedAccounts.email && 'Email',
    profile.linkedAccounts.google && 'Google',
    profile.linkedAccounts.x && 'X',
  ].filter(Boolean) as string[]

  const handleCopyClick = () => {
    if (!address) {
      return
    }

    copy(address)
    setCopied(true)

    setTimeout(() => {
      if (isMounted()) {
        setCopied(false)
      }
    }, 1000)
  }

  const handleDisconnect = async () => {
    try {
      if (authenticated) {
        await logout()
      }
    }
    catch {}

    disconnect()
  }

  const itemClassName = 'flex items-center justify-between rounded-sm border border-white/5 bg-bg-l1 px-3 py-2 text-caption-13 text-grey-60 transition hover:text-grey-90 hover:border-white/10'

  return (
    <div className="border border-grey-20 p-2 ds:w-[19.5rem] bg-bg-l2 rounded-md overflow-hidden">
      <div className="rounded-md border border-white/8 bg-bg-l1 p-3">
        <div className="flex items-center gap-3">
          <ProfileAvatar
            className="size-11"
            avatarDataUrl={profile.avatarDataUrl}
            displayName={profile.displayName}
          />
          <div className="min-w-0">
            <div className="truncate text-caption-14 font-semibold text-grey-90">{profile.displayName}</div>
            <div className="mt-1 text-caption-12 text-grey-60">{shortenAddress(address || '')}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-sm bg-bg-l0 px-3 py-2 text-caption-12 text-grey-60">
          <span>Member since {dayjs(profile.memberSince).format('MMM D, YYYY')}</span>
          <div className="flex items-center gap-1.5">
            <button
              className={cx('rounded-full border border-grey-15 px-2 py-1 transition hover:text-grey-90', { '!text-accent-green': isCopied })}
              onClick={handleCopyClick}
              type="button"
            >
              {isCopied ? 'Copied' : 'Copy'}
            </button>
            <a
              className="rounded-full border border-grey-15 p-1.5 transition hover:text-grey-90"
              href={address ? `${appChain.blockExplorers!.default.url}/address/${address}` : undefined}
              rel="noreferrer"
              target="_blank"
            >
              <Icon className="size-4" name="interface/external_link" />
            </a>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {
            linkedAccounts.length ? (
              linkedAccounts.map((accountLabel) => (
                <span key={accountLabel} className="rounded-full border border-brand-50/25 bg-brand-50/10 px-2.5 py-1 text-caption-12 text-brand-50">
                  {accountLabel} linked
                </span>
              ))
            ) : (
              <span className="rounded-full border border-white/8 px-2.5 py-1 text-caption-12 text-grey-60">
                No linked accounts yet
              </span>
            )
          }
        </div>
      </div>

      <div className="mt-2 space-y-2">
        <Href className={itemClassName} to="/profile?tab=account">
          <span className="flex items-center">
            <Icon className="mr-2 size-4" name="interface/user_avatar" />
            Profile
          </span>
          <Icon className="size-4" name="interface/caret_right" />
        </Href>
        <Href className={itemClassName} to="/profile?tab=account#my-bets">
          <span className="flex items-center">
            <Icon className="mr-2 size-4" name="interface/mybets" />
            My Bets
          </span>
          <Icon className="size-4" name="interface/caret_right" />
        </Href>
        <button
          className={cx(itemClassName, 'w-full')}
          onClick={() => openModal('QuickTourModal')}
          type="button"
        >
          <span className="flex items-center">
            <Icon className="mr-2 size-4" name="interface/info-circle" />
            Quick Tour
          </span>
          <Icon className="size-4" name="interface/caret_right" />
        </button>
        <button
          className={cx(itemClassName, 'w-full hover:text-accent-red')}
          onClick={handleDisconnect}
          type="button"
        >
          <span className="flex items-center">
            <Icon className="mr-2 size-4" name="interface/logout" />
            Disconnect
          </span>
          <Icon className="size-4" name="interface/caret_right" />
        </button>
      </div>
    </div>
  )
}

const User: React.FC = () => {
  const { profile } = usePrediktUser()

  return (
    <Dropdown
      className={cx('group')}
      contentClassName="mb:p-0"
      buttonClassName="wd:h-10 -wd:h-8"
      content={<Content />}
      placement="bottomRight"
    >
      <div className="flex items-center text-grey-60 ui-open:text-grey-90 hover:text-grey-90">
        <ProfileAvatar
          className="ds:size-10 mb:size-8"
          avatarDataUrl={profile.avatarDataUrl}
          displayName={profile.displayName}
        />
        <Icon className="size-5 ui-open:rotate-180 ml-1" name="interface/caret_down" />
      </div>
    </Dropdown>
  )
}

export default User
