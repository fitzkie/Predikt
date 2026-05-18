'use client'

import React from 'react'
import { useBetTokenBalance, useBetsSummary, useChain, useNativeBalance } from '@azuro-org/sdk'
import { type ChainId } from '@azuro-org/toolkit'
import { Listbox, ListboxButton, ListboxOptions } from '@headlessui/react'
import { Message } from '@locmod/intl'
import cx from 'classnames'
import { openModal } from '@locmod/modal'
import { usePathname } from 'next/navigation'
import { useBalance } from 'wagmi'
import { polygon } from 'viem/chains'
import { config } from 'wallet'
import { useWallet } from 'wallet'
import { constants, toLocaleString } from 'helpers'

import { Icon } from 'components/ui'
import { Dropdown } from 'components/inputs'

import messages from './messages'


// Native USDC on Polygon (Circle-issued) — the collateral token for Predikts/Polymarket
const NATIVE_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as `0x${string}`

type ChainCurrencyProps = {
  className?: string
  chainClassName?: string
  chainId: ChainId
  size: 4 | 5
  borderColor?: 'bg-l0' | 'grey-10' | 'grey-20'
  withGrayscale?: boolean
  currencyIconOverride?: string
}

const ChainCurrency: React.FC<ChainCurrencyProps> = ({ className, chainClassName, chainId, size, withGrayscale, currencyIconOverride }) => {
  return (
    <div className={cx('flex items-center', className)}>
      <div className={cx('border-2 rounded-full z-10 transition-colors', chainClassName)}>
        <Icon
          className={`size-${size}`}
          name={constants.chainIcons[chainId]}
        />
      </div>
      <Icon
        className={cx('-ml-1.5', `size-${size}`, { 'grayscale': withGrayscale })}
        name={(currencyIconOverride as any) ?? constants.currencyIcons[chainId]}
      />
    </div>
  )
}

const ChainSelect: React.FC = () => {
  const { appChain, setAppChainId } = useChain()
  const pathname = usePathname()
  const isPredikts = pathname?.startsWith('/predikts')

  return (
    <div className="border border-grey-20 p-1 rounded-md" onClick={(e) => e.stopPropagation()}>
      <Listbox value={appChain.id} onChange={setAppChainId}>
        <ListboxButton
          className="p-2 flex items-center justify-between w-full group/select"
        >
          <div className="flex items-center">
            <ChainCurrency
              className="mr-2"
              chainClassName="border-bg-l2"
              chainId={appChain.id}
              size={4}
              currencyIconOverride={isPredikts ? 'currency/usdc' : undefined}
            />
            <div className="text-caption-13">{appChain.name}</div>
          </div>
          <Icon className="size-4 text-grey-60 group-hover/select:text-grey-90 transition-colors group-aria-[controls]/select:rotate-180" name="interface/chevron_down" />
        </ListboxButton>
        <ListboxOptions className="w-full space-y-[2px]" modal={false}>
          {
            config.chains.map((chain) => {
              const isActive = appChain.id === chain.id

              return (
                <Listbox.Option
                  key={chain.id}
                  value={chain.id}
                  className="flex items-center justify-between p-2 cursor-pointer bg-bg-l3 first-of-type:rounded-t-sm last-of-type:rounded-b-sm"
                >
                  <div className="flex items-center">
                    <ChainCurrency
                      chainId={chain.id}
                      chainClassName="border-bg-l3"
                      className="mr-2"
                      size={4}
                    />
                    <div className="text-caption-12">{chain.name}</div>
                  </div>
                  <div
                    className={
                      cx('size-4 border flex items-center justify-center rounded-full',
                        {
                          'border-grey-20': !isActive, 'border-brand-70': isActive,
                        })
                    }
                  >
                    {
                      isActive && (
                        <div className="size-3 bg-brand-50 rounded-full" />
                      )
                    }
                  </div>
                </Listbox.Option>
              )
            })
          }
        </ListboxOptions>
      </Listbox>
    </div>
  )
}

const BalanceInfo: React.FC = () => {
  const { account: address } = useWallet()
  const { appChain, betToken } = useChain()
  const pathname = usePathname()
  const isPredikts = pathname?.startsWith('/predikts')
  const { data: balanceData, isLoading: isBalanceFetching } = useBetTokenBalance()
  const { data: nativeBalanceData, isLoading: isNativeBalanceFetching } = useNativeBalance()
  const { data: betsSummaryData, isLoading: isBetsSummaryFetching } = useBetsSummary({
    account: address!,
  })
  const [pUsdBalance, setPUsdBalance] = React.useState<number | null>(null)
  const [isPUsdLoading, setPUsdLoading] = React.useState(false)

  React.useEffect(() => {
    if (!address) return

    setPUsdLoading(true)
    fetch(`/api/predikts/balance?address=${address}`)
      .then((r) => r.json())
      .then((d) => setPUsdBalance(typeof d.balance === 'number' ? d.balance : 0))
      .catch(() => setPUsdBalance(0))
      .finally(() => setPUsdLoading(false))
  }, [address])

  return (
    <div className="rounded-md bg-bg-l1 overflow-hidden">
      <div className="py-2 px-3">
        <Message className="text-caption-13 text-grey-60 mb-[2px]" value={messages.balance} />
        <div className="space-x-1">
          {isPUsdLoading ? (
            <div className="bone h-4 w-10 rounded-full" />
          ) : (
            <span className="text-caption-13 font-semibold">
              ${toLocaleString(pUsdBalance ?? 0, { digits: 2 })} pUSD
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const Content: React.FC = () => {
  const pathname = usePathname()
  const isPredikts = pathname?.startsWith('/predikts')

  const handleDepositClick = (event: React.MouseEvent) => {
    event.stopPropagation()

    if (isPredikts) {
      openModal('PrediktsDepositModal')
    }
    else {
      openModal('SportsDepositModal')
    }
  }

  const handleWithdrawClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    openModal('PrediktsWithdrawModal')
  }

  return (
    <div className="border border-grey-20 p-2 ds:w-[18.75rem] bg-bg-l2 rounded-md overflow-hidden space-y-2">
      <ChainSelect />
      <BalanceInfo />
      <div className="flex gap-2">
        <button
          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md bg-brand-50 text-caption-13 font-semibold text-black hover:bg-brand-50/90 transition-colors"
          onClick={handleDepositClick}
          type="button"
        >
          <Icon className="size-4" name="interface/deposit" />
          Deposit
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md border border-grey-20 text-caption-13 font-semibold text-grey-90 hover:border-grey-40 transition-colors"
          onClick={handleWithdrawClick}
          type="button"
        >
          <Icon className="size-4" name="interface/withdraw" />
          Withdraw
        </button>
      </div>
    </div>
  )
}

const Balance: React.FC = () => {
  const { account: address } = useWallet()
  const pathname = usePathname()
  const isPredikts = pathname?.startsWith('/predikts')
  const [pUsdBalance, setPUsdBalance] = React.useState<number | null>(null)
  const [isLoading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!address) return

    setLoading(true)
    fetch(`/api/predikts/balance?address=${address}`)
      .then((r) => r.json())
      .then((d) => setPUsdBalance(typeof d.balance === 'number' ? d.balance : 0))
      .catch(() => setPUsdBalance(0))
      .finally(() => setLoading(false))
  }, [address])

  const handleDepositClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()

    if (isPredikts) {
      openModal('PrediktsDepositModal')
    }
    else {
      openModal('SportsDepositModal')
    }
  }

  const rootClassName = cx('wd:h-10 -wd:h-8 bg-grey-10 flex items-center justify-between border border-transparent pl-1.5 pr-1 w-fit text-grey-60 ui-open:text-grey-90 hover:text-grey-90 ui-open:border-grey-20 hover:border-grey-20 transition-all mb:w-full rounded-md')

  return (
    <Dropdown
      className={cx('group')}
      contentClassName="mb:p-0"
      content={<Content />}
      placement="bottomRight"
      renderType="popover"
    >
      <div className={rootClassName}>
        <div className="flex items-center">
          <Icon className="size-5 mr-1.5 text-grey-50" name="currency/usdc" />
          {
            isLoading ? (
              <div className="bone h-4 w-10 rounded-full" />
            ) : (
              <div className="text-caption-13">${toLocaleString(pUsdBalance ?? 0, { digits: 2 })} <span className="text-grey-50 text-caption-11">pUSD</span></div>
            )
          }
          <Icon className="size-4 ui-open:rotate-180" name="interface/caret_down" />
        </div>
        <div
          className="flex items-center justify-center h-6 px-2 rounded-min bg-brand-50 ml-2 cursor-pointer text-grey-90 text-caption-12 font-semibold flex-none"
          onClick={handleDepositClick}
          onMouseEnter={(event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()}
        >
          Deposit
        </div>
      </div>
    </Dropdown>
  )
}

export default Balance
