'use client'

import type { ModalComponent } from '@locmod/modal'
import { useWallet } from 'wallet'

import { PlainModal, Warning } from 'components/feedback'
import { Icon } from 'components/ui'


// Polygon token addresses
const USDC_E_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
const NATIVE_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'

const swapOptions = [
  {
    name: 'Uniswap',
    description: 'USDC.e → USDC on Polygon',
    url: `https://app.uniswap.org/swap?chain=polygon&inputCurrency=${USDC_E_ADDRESS}&outputCurrency=${NATIVE_USDC_ADDRESS}`,
    icon: '↔',
  },
  {
    name: '1inch',
    description: 'Best rate aggregator',
    url: `https://app.1inch.io/#/137/unified/swap/${USDC_E_ADDRESS}/${NATIVE_USDC_ADDRESS}`,
    icon: '↔',
  },
]

const PrediktsExchangeModal: ModalComponent = ({ closeModal }) => {
  const { account } = useWallet()

  if (!account) {
    return null
  }

  return (
    <PlainModal className="ds:max-w-[480px]" withCloseButton closeModal={closeModal}>
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center size-12 mx-auto rounded-full bg-brand-50/15 mb-3">
          <Icon className="size-6 text-brand-50" name="interface/withdraw" />
        </div>
        <h3 className="text-heading-h2 font-bold">Exchange</h3>
        <p className="mt-2 text-caption-14 text-grey-60">
          Swap tokens on Polygon using a decentralized exchange.
        </p>
      </div>

      <Warning
        className="mb-4"
        text={{ en: 'Predikt Markets requires native USDC on Polygon. If you have USDC.e (bridged USDC), swap it to USDC using one of the options below.' }}
      />

      <div className="space-y-2">
        {swapOptions.map((option) => (
          <a
            key={option.name}
            className="flex items-center justify-between rounded-md border border-grey-20 bg-bg-l3 px-4 py-3 transition hover:border-brand-50/40 hover:bg-bg-l2"
            href={option.url}
            rel="noopener noreferrer"
            target="_blank"
            onClick={() => closeModal()}
          >
            <div>
              <div className="text-caption-14 font-semibold text-grey-90">{option.name}</div>
              <div className="mt-0.5 text-caption-12 text-grey-60">{option.description}</div>
            </div>
            <Icon className="size-4 text-grey-60 shrink-0" name="interface/external_link" />
          </a>
        ))}
      </div>

      <p className="mt-4 text-caption-12 text-grey-60 text-center">
        After swapping, return here and use the <strong className="text-grey-90">Deposit</strong> button to fund your wallet with USDC.
      </p>
    </PlainModal>
  )
}

declare global {
  interface ModalsRegistry extends ExtendModalsRegistry<{ PrediktsExchangeModal: typeof PrediktsExchangeModal }> {}
}

export default PrediktsExchangeModal
