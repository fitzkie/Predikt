'use client'

import { type ModalComponent } from '@locmod/modal'
import { useState } from 'react'
import { useBalance } from 'wagmi'
import { polygon } from 'viem/chains'
import copy from 'copy-to-clipboard'
import { useWallet } from 'wallet'
import { useIsMounted } from 'hooks'

import { PlainModal } from 'components/feedback'
import { Button } from 'components/inputs'


// USDC.e (bridged USDC) on Polygon — the collateral token used by Polymarket
const USDC_E_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as const

const PrediktsDepositModal: ModalComponent = ({ closeModal }) => {
  const { account } = useWallet()
  const isMounted = useIsMounted()
  const [ isCopied, setIsCopied ] = useState(false)
  const { data: usdceBalance, isLoading: isBalanceLoading } = useBalance({
    address: account as `0x${string}` | undefined,
    token: USDC_E_ADDRESS,
    chainId: polygon.id,
  })

  const handleCopy = () => {
    if (!account) {
      return
    }

    copy(account)
    setIsCopied(true)

    setTimeout(() => {
      if (isMounted()) {
        setIsCopied(false)
      }
    }, 1000)
  }

  if (!account) {
    return null
  }

  const balance = usdceBalance
    ? Number(usdceBalance.formatted).toFixed(2)
    : '0.00'

  return (
    <PlainModal className="ds:max-w-[540px]" withCloseButton closeModal={closeModal}>
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center size-12 mx-auto rounded-full bg-brand-50/15 mb-3">
          <span className="text-caption-12 font-bold text-brand-50">pUSD</span>
        </div>
        <h3 className="text-heading-h2 font-bold">Deposit USDC.e (pUSD)</h3>
        <p className="mt-2 text-caption-14 text-grey-60">
          {'Your balance '}
          <span className="font-semibold text-grey-90">
            {isBalanceLoading ? '...' : `${balance} USDC.e`}
          </span>
        </p>
      </div>

      <ol className="bg-bg-l3 rounded-md text-caption-13 divide-y divide-grey-20 mb-4">
        <li className="flex items-start gap-3 py-3 px-2">
          <span className="flex-none flex items-center justify-center size-6 rounded-md bg-brand-50 text-caption-12 font-semibold text-black">
            1
          </span>
          <p className="text-grey-60 leading-5">
            {'Buy '}
            <strong className="text-grey-90">USDC.e</strong>
            {' (also listed as '}
            <strong className="text-grey-90">pUSD</strong>
            {') on Coinbase, Binance, or another exchange.'}
          </p>
        </li>
        <li className="flex items-start gap-3 py-3 px-2">
          <span className="flex-none flex items-center justify-center size-6 rounded-md bg-brand-50 text-caption-12 font-semibold text-black">
            2
          </span>
          <p className="text-grey-60 leading-5">
            {'Send USDC.e to your wallet address below and select '}
            <strong className="text-grey-90">Polygon</strong>
            {' as the network.'}
          </p>
        </li>
      </ol>

      <div className="px-3 py-2.5 rounded-md border border-grey-20 text-caption-14 font-medium text-grey-90 break-all">
        {account}
      </div>
      <div className="mt-2">
        <Button
          className="w-full"
          title={isCopied ? { en: 'Copied!' } : { en: 'Copy Address' }}
          size={40}
          leftIcon={isCopied ? 'interface/accepted' : 'interface/copy'}
          onClick={handleCopy}
        />
      </div>
    </PlainModal>
  )
}

declare global {
  interface ModalsRegistry extends ExtendModalsRegistry<{ PrediktsDepositModal: typeof PrediktsDepositModal }> {}
}

export default PrediktsDepositModal
