'use client'

import { type ModalComponent } from '@locmod/modal'
import { useEffect, useRef, useState } from 'react'
import copy from 'copy-to-clipboard'
import { useGlidePay } from '@paywithglide/glide-react'
import { useIsMounted } from 'hooks'
import { useWallet } from 'wallet'

import { PlainModal, QRCode, Warning } from 'components/feedback'
import { Button, ButtonBase } from 'components/inputs'
import { Icon } from 'components/ui'


type Tab = 'glide' | 'direct'

// ── Glide tab ────────────────────────────────────────────────────────────────

type GlideDepositProps = {
  address: string | undefined
  onSuccess: (newBalance: number) => void
}

const GlideDeposit: React.FC<GlideDepositProps> = ({ address, onSuccess }) => {
  const [amount, setAmount] = useState(10)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pendingOpenRef = useRef(false)

  const { openGlidePay } = useGlidePay({
    app: process.env.NEXT_PUBLIC_GLIDE_PROJECT_ID!,
    sessionId,
    onSuccess: async (_txHash, session) => {
      try {
        const res = await fetch('/api/predikts/glide-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.sessionId, userAddress: address }),
        })
        const data = await res.json()

        if (data.newBalance !== undefined) {
          onSuccess(data.newBalance)
        }
      }
      catch {}
    },
    onClose: () => {
      pendingOpenRef.current = false
    },
  })

  // Open Glide widget once sessionId is set
  useEffect(() => {
    if (pendingOpenRef.current && sessionId) {
      pendingOpenRef.current = false
      openGlidePay()
    }
  }, [sessionId, openGlidePay])

  const handleDeposit = async () => {
    if (isCreatingSession || !address) return

    setError(null)
    setIsCreatingSession(true)
    pendingOpenRef.current = true

    try {
      const res = await fetch('/api/predikts/glide-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: address, amountUsdc: amount }),
      })
      const data = await res.json()

      if (!data.sessionId) {
        setError(data.error || 'Failed to start deposit session.')
        pendingOpenRef.current = false

        return
      }

      setSessionId(data.sessionId)
    }
    catch {
      setError('Could not reach payment service. Try again.')
      pendingOpenRef.current = false
    }
    finally {
      setIsCreatingSession(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-caption-13 text-grey-60 leading-5">
        Pay with a credit card, Coinbase, any exchange, or any wallet on any chain.
        You&apos;ll receive exactly the amount below in your Predikt Markets balance.
      </p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-caption-13 text-grey-60">$</span>
          <input
            className="w-full rounded-md border border-grey-20 bg-bg-l3 pl-6 pr-3 py-2 text-caption-13 text-grey-90 outline-none focus:border-brand-50 transition-colors"
            min={1}
            step={1}
            type="number"
            value={amount}
            onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
          />
        </div>
        <span className="text-caption-13 text-grey-60 flex-none">USDC</span>
      </div>
      {error && (
        <p className="text-caption-12 text-red-400">{error}</p>
      )}
      <Button
        className="w-full"
        title={isCreatingSession ? { en: 'Opening…' } : { en: `Deposit $${amount} USDC` }}
        size={40}
        disabled={isCreatingSession || amount < 1}
        onClick={handleDeposit}
      />
    </div>
  )
}

// ── Direct send tab ───────────────────────────────────────────────────────────

type DirectSendProps = {
  userAddress: string | undefined
  onSuccess: (newBalance: number) => void
}

const DirectSend: React.FC<DirectSendProps> = ({ userAddress, onSuccess }) => {
  const isMounted = useIsMounted()
  const [isCopied, setIsCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [platformAddress, setPlatformAddress] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    fetch('/api/predikts/deposit')
      .then((r) => r.json())
      .then((d) => { if (d.depositAddress) setPlatformAddress(d.depositAddress) })
      .catch(() => {})
  }, [])

  // Poll for incoming transfers while this tab is visible
  useEffect(() => {
    if (!userAddress) return

    const check = async () => {
      setIsChecking(true)

      try {
        const res = await fetch(`/api/predikts/check-deposit?userAddress=${userAddress}`)
        const data = await res.json()

        if (data.found && data.credited > 0) {
          onSuccess(data.newBalance)
        }
      }
      catch {}
      finally {
        if (isMounted()) setIsChecking(false)
      }
    }

    check()
    const interval = setInterval(check, 30_000)

    return () => clearInterval(interval)
  }, [userAddress, isMounted, onSuccess])

  const handleCopy = () => {
    if (!platformAddress) return

    copy(platformAddress)
    setIsCopied(true)
    setTimeout(() => { if (isMounted()) setIsCopied(false) }, 1500)
  }

  const depositAddress = platformAddress || 'Loading…'

  if (showQR) {
    return (
      <div>
        <div className="relative flex items-center justify-center bg-brand-50 rounded-md min-h-[200px] mb-4">
          <ButtonBase
            className="absolute top-3 left-3 bg-black/20 rounded-full p-1 size-7"
            ariaLabel="Back"
            onClick={() => setShowQR(false)}
          >
            <Icon name="interface/arrow_back" className="w-full h-full" />
          </ButtonBase>
          {platformAddress && (
            <QRCode
              className="h-36 w-36 rounded-md bg-white p-2"
              uri={platformAddress}
              size={128}
            />
          )}
        </div>
        <Button
          className="w-full"
          title={{ en: 'Back' }}
          size={40}
          style="secondary"
          onClick={() => setShowQR(false)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Warning
        text={{ en: 'Send native USDC on Polygon only. Not USDC.e, not USDC on other chains — funds may be lost.' }}
      />
      <ol className="bg-bg-l3 rounded-md text-caption-13 divide-y divide-grey-20">
        <li className="flex items-start gap-3 py-3 px-2">
          <span className="flex-none flex items-center justify-center size-6 rounded-md bg-brand-50 text-caption-12 font-semibold text-black">1</span>
          <p className="text-grey-60 leading-5">
            {'Buy '}
            <strong className="text-grey-90">USDC</strong>
            {' on Coinbase or Binance. Select '}
            <strong className="text-grey-90">Polygon</strong>
            {' as the withdrawal network.'}
          </p>
        </li>
        <li className="flex items-start gap-3 py-3 px-2">
          <span className="flex-none flex items-center justify-center size-6 rounded-md bg-brand-50 text-caption-12 font-semibold text-black">2</span>
          <p className="text-grey-60 leading-5">Send to the address below. Your balance updates automatically within a few minutes.</p>
        </li>
      </ol>
      <div className="px-3 py-2.5 rounded-md border border-grey-20 text-caption-13 font-medium text-grey-90 break-all">
        {depositAddress}
      </div>
      <div className="flex items-center gap-2">
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
      {userAddress && (
        <p className="text-caption-12 text-grey-50 text-center">
          {isChecking ? 'Checking for your deposit…' : 'Watching for incoming transfers'}
        </p>
      )}
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

const PrediktsDepositModal: ModalComponent = ({ closeModal }) => {
  const { account: address } = useWallet()
  const [tab, setTab] = useState<Tab>('glide')
  const [successBalance, setSuccessBalance] = useState<number | null>(null)

  if (successBalance !== null) {
    return (
      <PlainModal className="ds:max-w-[480px]" withCloseButton closeModal={closeModal}>
        <div className="text-center py-4 space-y-3">
          <div className="inline-flex items-center justify-center size-14 mx-auto rounded-full bg-green-500/15">
            <Icon name="interface/accepted" className="size-7 text-green-400" />
          </div>
          <h3 className="text-heading-h2 font-bold text-grey-90">Deposit received!</h3>
          <p className="text-caption-14 text-grey-60">
            Your new Predikt Markets balance is
            {' '}
            <strong className="text-grey-90">${successBalance.toFixed(2)} pUSD</strong>.
          </p>
          <Button className="w-full mt-2" title={{ en: 'Done' }} size={40} onClick={() => closeModal()} />
        </div>
      </PlainModal>
    )
  }

  return (
    <PlainModal className="ds:max-w-[480px]" withCloseButton closeModal={closeModal}>
      <div className="mb-4">
        <h3 className="text-heading-h2 font-bold text-grey-90">Add Funds</h3>
        <p className="mt-1 text-caption-13 text-grey-60">Fund your Predikt Markets balance with USDC.</p>
      </div>

      {/* Tab toggle */}
      <div className="flex rounded-md bg-bg-l3 p-0.5 mb-4">
        <button
          className={`flex-1 py-1.5 text-caption-13 font-semibold rounded-[5px] transition-colors ${tab === 'glide' ? 'bg-bg-l1 text-grey-90' : 'text-grey-60 hover:text-grey-90'}`}
          type="button"
          onClick={() => setTab('glide')}
        >
          Card / Exchange / Wallet
        </button>
        <button
          className={`flex-1 py-1.5 text-caption-13 font-semibold rounded-[5px] transition-colors ${tab === 'direct' ? 'bg-bg-l1 text-grey-90' : 'text-grey-60 hover:text-grey-90'}`}
          type="button"
          onClick={() => setTab('direct')}
        >
          Send from Polygon
        </button>
      </div>

      {tab === 'glide' ? (
        <GlideDeposit
          address={address as string}
          onSuccess={setSuccessBalance}
        />
      ) : (
        <DirectSend
          userAddress={address as string | undefined}
          onSuccess={setSuccessBalance}
        />
      )}
    </PlainModal>
  )
}

declare global {
  interface ModalsRegistry extends ExtendModalsRegistry<{ PrediktsDepositModal: typeof PrediktsDepositModal }> {}
}

export default PrediktsDepositModal
