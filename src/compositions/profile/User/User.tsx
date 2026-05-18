'use client'

import React, { useRef, useState } from 'react'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'
import cx from 'classnames'
import { useChain } from '@azuro-org/sdk'
import { useWallet } from 'wallet'
import { usePrediktUser } from 'providers/user'
import { useOptionalPrivy } from 'providers/auth'
import { useIsMounted } from 'hooks'
import { shortenAddress, toLocaleString } from 'helpers'

import { ProfileAvatar } from 'components/dataDisplay'
import { Icon } from 'components/ui'
import { Button, Input } from 'components/inputs'
import useProfileStats from '../useProfileStats'


const tabs = [ 'account', 'referrals' ] as const

const statsCardClassName = 'rounded-md border border-white/10 bg-bg-l1 px-4 py-4'

const User: React.FC = () => {
  const { account: address } = useWallet()
  const { appChain } = useChain()
  const { profile, referralLink, updateProfile } = usePrediktUser()
  const { linkGoogle, linkTwitter, linkEmail, isGoogleLinked, isXLinked, isEmailLinked, linkedEmailAddress } = useOptionalPrivy()
  const { betsCount, betAmount, payout, winRate, tokenSymbol } = useProfileStats()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [ isCopied, setCopied ] = useState(false)
  const [ isDepositCopied, setDepositCopied ] = useState(false)
  const [ isReferralCopied, setReferralCopied ] = useState(false)
  const [ depositAddress, setDepositAddress ] = useState<string | null>(null)
  const isMounted = useIsMounted()

  React.useEffect(() => {
    if (!address) return

    fetch(`/api/user/deposit-address?address=${address}`)
      .then((r) => r.json())
      .then((d) => { if (d.depositAddress) setDepositAddress(d.depositAddress) })
      .catch(() => {})
  }, [address])

  const activeTab = tabs.includes((searchParams.get('tab') || 'account') as typeof tabs[number])
    ? (searchParams.get('tab') as typeof tabs[number])
    : 'account'

  const handleTabChange = (index: number) => {
    const nextTab = tabs[index] || 'account'

    router.replace(`${pathname}?tab=${nextTab}`, { scroll: false })
  }

  const handleCopy = (value: string, type: 'address' | 'deposit' | 'referral') => {
    copy(value)

    if (type === 'address') {
      setCopied(true)
    }
    else if (type === 'deposit') {
      setDepositCopied(true)
    }
    else {
      setReferralCopied(true)
    }

    setTimeout(() => {
      if (isMounted()) {
        setCopied(false)
        setDepositCopied(false)
        setReferralCopied(false)
      }
    }, 1000)
  }

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const [ file ] = Array.from(event.target.files || [])

    if (!file) {
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      updateProfile({
        avatarDataUrl: typeof reader.result === 'string' ? reader.result : null,
      })
    }

    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-bg-l2 p-6">
        <div className="flex flex-col gap-6 ds:flex-row ds:items-start ds:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative">
              <ProfileAvatar
                className="size-20"
                avatarDataUrl={profile.avatarDataUrl}
                displayName={profile.displayName}
              />
              <button
                className="absolute -bottom-1 -right-1 rounded-full border border-white/10 bg-bg-l0 p-2 text-grey-60 transition hover:text-grey-90"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Icon className="size-4" name="interface/settings" />
              </button>
              <input
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                type="file"
              />
            </div>
            <div className="min-w-0">
              <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">Profile</div>
              <h1 className="mt-2 text-heading-h2 font-semibold text-grey-90">{profile.displayName}</h1>
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-caption-13 text-grey-60">
                  <span className="text-caption-11 uppercase tracking-[0.12em] text-grey-50 w-full">Login wallet (Privy)</span>
                  <span className="font-mono">{shortenAddress(address || '')}</span>
                  <span className="size-1 rounded-full bg-grey-40" />
                  <span>Member since {dayjs(profile.memberSince).format('MMM D, YYYY')}</span>
                </div>
                {depositAddress && (
                  <div className="flex flex-wrap items-center gap-2 text-caption-13 text-grey-60">
                    <span className="text-caption-11 uppercase tracking-[0.12em] text-grey-50 w-full">Predikts deposit address</span>
                    <span className="font-mono">{shortenAddress(depositAddress)}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="rounded-full border border-white/10 px-3 py-1.5 text-caption-12 text-grey-60 transition hover:text-grey-90"
                  onClick={() => address && handleCopy(address, 'address')}
                  type="button"
                >
                  {isCopied ? 'Login address copied' : 'Copy login address'}
                </button>
                {depositAddress && (
                  <button
                    className="rounded-full border border-white/10 px-3 py-1.5 text-caption-12 text-grey-60 transition hover:text-grey-90"
                    onClick={() => handleCopy(depositAddress, 'deposit')}
                    type="button"
                  >
                    {isDepositCopied ? 'Deposit address copied' : 'Copy deposit address'}
                  </button>
                )}
                <a
                  className="rounded-full border border-white/10 px-3 py-1.5 text-caption-12 text-grey-60 transition hover:text-grey-90"
                  href={address ? `${appChain.blockExplorers!.default.url}/address/${address}` : undefined}
                  rel="noreferrer"
                  target="_blank"
                >
                  View on explorer
                </a>
              </div>
            </div>
          </div>

          <div className="grid w-full gap-3 ds:max-w-[23rem] ds:grid-cols-2">
            <div className={statsCardClassName}>
              <div className="text-caption-12 uppercase tracking-[0.16em] text-grey-60">Bets</div>
              <div className="mt-2 text-heading-h3 font-semibold text-grey-90">{toLocaleString(betsCount)}</div>
            </div>
            <div className={statsCardClassName}>
              <div className="text-caption-12 uppercase tracking-[0.16em] text-grey-60">Bet Amount</div>
              <div className="mt-2 text-heading-h3 font-semibold text-grey-90">{toLocaleString(betAmount, { digits: 2 })} {tokenSymbol}</div>
            </div>
            <div className={statsCardClassName}>
              <div className="text-caption-12 uppercase tracking-[0.16em] text-grey-60">Payout</div>
              <div className="mt-2 text-heading-h3 font-semibold text-grey-90">{toLocaleString(payout, { digits: 2 })} {tokenSymbol}</div>
            </div>
            <div className={statsCardClassName}>
              <div className="text-caption-12 uppercase tracking-[0.16em] text-grey-60">Win Rate</div>
              <div className="mt-2 text-heading-h3 font-semibold text-grey-90">
                {winRate !== null ? `${winRate}%` : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <TabGroup selectedIndex={tabs.indexOf(activeTab)} onChange={handleTabChange}>
        <TabList className="flex gap-2 rounded-lg border border-white/10 bg-bg-l2 p-2">
          {
            tabs.map((tab) => (
              <Tab
                key={tab}
                className="rounded-md px-4 py-2 text-caption-13 font-semibold uppercase tracking-[0.16em] text-grey-60 outline-none transition data-[selected]:bg-brand-50 data-[selected]:text-grey-90"
              >
                {tab}
              </Tab>
            ))
          }
        </TabList>
        <TabPanels className="mt-4">
          <TabPanel className="rounded-xl border border-white/10 bg-bg-l2 p-6">
            <div className="grid gap-6 ds:grid-cols-[minmax(0,1fr)_20rem]">
              <div>
                <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">Account</div>
                <h2 className="mt-2 text-heading-h3 font-semibold text-grey-90">Identity and linked accounts</h2>
                <p className="mt-3 max-w-2xl text-caption-14 leading-7 text-grey-70">
                  Set the display name and image you want people to see on Predikt. Then link email, Google, or X so the account is ready for updates, payout sharing, and social posting flows later.
                </p>
                <div className="mt-6 grid gap-4">
                  <div>
                    <div className="mb-2 text-caption-12 uppercase tracking-[0.16em] text-grey-60">Display Name</div>
                    <Input
                      className="bg-bg-l1"
                      onChange={(value) => updateProfile({ displayName: value || 'Predikt User' })}
                      placeholder="Predikt User"
                      regExp="^.*$"
                      type="text"
                      value={profile.displayName}
                    />
                  </div>
                  <div className="rounded-lg border border-white/10 bg-bg-l1 p-4">
                    <div className="text-caption-12 uppercase tracking-[0.16em] text-grey-60">Avatar</div>
                    <div className="mt-3 flex items-center gap-3">
                      <ProfileAvatar
                        className="size-14"
                        avatarDataUrl={profile.avatarDataUrl}
                        displayName={profile.displayName}
                      />
                      <div className="flex gap-2">
                        <Button size={32} style="secondary" title="Upload Image" onClick={() => fileInputRef.current?.click()} />
                        {
                          profile.avatarDataUrl && (
                            <Button size={32} style="tertiary" title="Remove" onClick={() => updateProfile({ avatarDataUrl: null })} />
                          )
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-bg-l1 p-4">
                <div className="text-caption-12 uppercase tracking-[0.16em] text-brand-50">Linked Accounts</div>
                <div className="mt-4 space-y-4">
                  <div className="rounded-md border border-white/8 bg-bg-l0 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-caption-13 font-semibold text-grey-90">Email</div>
                        <div className="mt-1 text-caption-12 text-grey-60">
                          {isEmailLinked ? linkedEmailAddress : 'Add email for account recovery and updates.'}
                        </div>
                      </div>
                      <Button
                        size={32}
                        style={isEmailLinked ? 'secondary' : 'primary'}
                        title={isEmailLinked ? 'Linked' : 'Link Email'}
                        disabled={isEmailLinked}
                        onClick={linkEmail}
                      />
                    </div>
                  </div>
                  <div className="rounded-md border border-white/8 bg-bg-l0 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-caption-13 font-semibold text-grey-90">Google</div>
                        <div className="mt-1 text-caption-12 text-grey-60">
                          {isGoogleLinked ? 'Linked for easier sign-in.' : 'Add Google for one-click sign-in later.'}
                        </div>
                      </div>
                      <Button
                        size={32}
                        style={isGoogleLinked ? 'secondary' : 'primary'}
                        title={isGoogleLinked ? 'Linked' : 'Link Google'}
                        disabled={isGoogleLinked}
                        onClick={linkGoogle}
                      />
                    </div>
                  </div>
                  <div className="rounded-md border border-white/8 bg-bg-l0 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-caption-13 font-semibold text-grey-90">X</div>
                        <div className="mt-1 text-caption-12 text-grey-60">
                          {isXLinked ? 'Linked for payout and trade-sharing flows.' : 'Link X so trade exits and payouts can be shared later.'}
                        </div>
                      </div>
                      <Button
                        size={32}
                        style={isXLinked ? 'secondary' : 'primary'}
                        title={isXLinked ? 'Linked' : 'Link X'}
                        disabled={isXLinked}
                        onClick={linkTwitter}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>

          <TabPanel className="rounded-xl border border-white/10 bg-bg-l2 p-6">
            <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">Referrals</div>
            <h2 className="mt-2 text-heading-h3 font-semibold text-grey-90">Invite people into Predikt</h2>
            <p className="mt-3 max-w-2xl text-caption-14 leading-7 text-grey-70">
              Every user gets a dedicated invite link. Track how many users, bets, and total bet volume come through that link as referrals start converting.
            </p>

            <div className="mt-6 rounded-lg border border-white/10 bg-bg-l1 p-4">
              <div className="text-caption-12 uppercase tracking-[0.16em] text-grey-60">Referral Link</div>
              <div className="mt-3 flex flex-col gap-3 ds:flex-row">
                <div className="flex-1 rounded-md border border-white/8 bg-bg-l0 px-3 py-3 text-caption-13 text-grey-90">
                  {referralLink}
                </div>
                <Button
                  size={40}
                  style="secondary"
                  title={isReferralCopied ? 'Copied' : 'Copy Link'}
                  onClick={() => handleCopy(referralLink, 'referral')}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 ds:grid-cols-3">
              <div className={statsCardClassName}>
                <div className="text-caption-12 uppercase tracking-[0.16em] text-grey-60">Users</div>
                <div className="mt-2 text-heading-h3 font-semibold text-grey-90">0</div>
              </div>
              <div className={statsCardClassName}>
                <div className="text-caption-12 uppercase tracking-[0.16em] text-grey-60">Bets</div>
                <div className="mt-2 text-heading-h3 font-semibold text-grey-90">0</div>
              </div>
              <div className={statsCardClassName}>
                <div className="text-caption-12 uppercase tracking-[0.16em] text-grey-60">Bet Volume</div>
                <div className="mt-2 text-heading-h3 font-semibold text-grey-90">0.00 {tokenSymbol}</div>
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  )
}

export default User
