'use client'

import { type ModalComponent } from '@locmod/modal'
import { useEffect, useState } from 'react'
import copy from 'copy-to-clipboard'
import { useIsMounted } from 'hooks'

import { PlainModal, QRCode, Warning } from 'components/feedback'
import { Button, ButtonBase } from 'components/inputs'
import { Icon } from 'components/ui'


const PrediktsDepositModal: ModalComponent = ({ closeModal }) => {
  const isMounted = useIsMounted()
  const [ isCopied, setIsCopied ] = useState(false)
  const [ showQR, setShowQR ] = useState(false)
  const [ platformAddress, setPlatformAddress ] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/predikts/deposit')
      .then((r) => r.json())
      .then((d) => { if (d.depositAddress) setPlatformAddress(d.depositAddress) })
      .catch(() => {})
  }, [])

  const handleCopy = () => {
    if (!platformAddress) return

    copy(platformAddress)
    setIsCopied(true)

    setTimeout(() => {
      if (isMounted()) setIsCopied(false)
    }, 1500)
  }

  const depositAddress = platformAddress || 'Loading…'

  if (showQR) {
    return (
      <PlainModal className="ds:max-w-[540px]" closeModal={closeModal}>
        <div className="relative flex items-center justify-center bg-brand-50 rounded-t-md min-h-[240px]">
          <ButtonBase
            className="absolute top-3.5 left-3.5 bg-black/20 rounded-full p-1 size-7"
            ariaLabel="Back"
            onClick={() => setShowQR(false)}
          >
            <Icon name="interface/arrow_back" className="w-full h-full" />
          </ButtonBase>
          {platformAddress && (
            <QRCode
              className="h-40 w-40 rounded-md bg-white p-2.5"
              uri={platformAddress}
              size={134}
            />
          )}
        </div>
        <div className="pt-6 px-4 pb-4 text-center">
          <h3 className="text-heading-h3 font-bold text-grey-90">Scan to Deposit</h3>
          <p className="mt-2 text-caption-14 text-grey-60">
            Send <strong className="text-grey-90">native USDC</strong> on <strong className="text-grey-90">Polygon</strong> to the Predikt Markets platform address.
          </p>
          <Warning
            className="mt-4"
            text={{ en: 'Send native USDC on Polygon only. Not USDC.e (bridged), not USDC on other networks.' }}
          />
          <Button
            className="w-full mt-4"
            title={{ en: 'Back' }}
            size={40}
            style="secondary"
            onClick={() => setShowQR(false)}
          />
        </div>
      </PlainModal>
    )
  }

  return (
    <PlainModal className="ds:max-w-[540px]" withCloseButton closeModal={closeModal}>
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center size-12 mx-auto rounded-full bg-brand-50/15 mb-3">
          <span className="text-caption-12 font-bold text-brand-50">USDC</span>
        </div>
        <h3 className="text-heading-h2 font-bold">Deposit USDC</h3>
        <p className="mt-2 text-caption-14 text-grey-60">
          Funds are credited to your Predikt Markets balance automatically.
        </p>
      </div>

      <Warning
        className="mb-4"
        text={{ en: 'Send native USDC on Polygon only. Do not send USDC.e, USDT, or USDC on other chains — funds may be lost.' }}
      />

      <ol className="bg-bg-l3 rounded-md text-caption-13 divide-y divide-grey-20 mb-4">
        <li className="flex items-start gap-3 py-3 px-2">
          <span className="flex-none flex items-center justify-center size-6 rounded-md bg-brand-50 text-caption-12 font-semibold text-black">1</span>
          <p className="text-grey-60 leading-5">
            {'Buy '}
            <strong className="text-grey-90">USDC</strong>
            {' on Coinbase, Binance, or another exchange. Select '}
            <strong className="text-grey-90">Polygon</strong>
            {' as the withdrawal network.'}
          </p>
        </li>
        <li className="flex items-start gap-3 py-3 px-2">
          <span className="flex-none flex items-center justify-center size-6 rounded-md bg-brand-50 text-caption-12 font-semibold text-black">2</span>
          <p className="text-grey-60 leading-5">
            {'Send USDC to the Predikt Markets deposit address below on Polygon. Your balance will update within a few minutes.'}
          </p>
        </li>
      </ol>

      <div className="px-3 py-2.5 rounded-md border border-grey-20 text-caption-14 font-medium text-grey-90 break-all">
        {depositAddress}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button
          className="flex-1"
          title={isCopied ? { en: 'Copied!' } : { en: 'Copy Address' }}
          size={40}
          leftIcon={isCopied ? 'interface/accepted' : 'interface/copy'}
          onClick={handleCopy}
        />
        {platformAddress && (
          <ButtonBase
            className="flex-none size-10 border border-grey-20 rounded-md p-2 text-grey-60 hover:text-brand-50"
            onClick={() => setShowQR(true)}
          >
            <Icon name="interface/qr_code" className="size-full" />
          </ButtonBase>
        )}
      </div>
    </PlainModal>
  )
}

declare global {
  interface ModalsRegistry extends ExtendModalsRegistry<{ PrediktsDepositModal: typeof PrediktsDepositModal }> {}
}

export default PrediktsDepositModal
