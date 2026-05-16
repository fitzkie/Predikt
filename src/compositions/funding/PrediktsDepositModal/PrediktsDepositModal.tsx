'use client'

import { type ModalComponent } from '@locmod/modal'
import { useEffect, useRef, useState } from 'react'
import { encodeFunctionData, erc20Abi, parseUnits } from 'viem'
import { polygon } from 'viem/chains'
import { useBalance, usePublicClient } from 'wagmi'
import copy from 'copy-to-clipboard'
import { useIsMounted } from 'hooks'
import { useWallet } from 'wallet'

import { PlainModal, QRCode, Warning } from 'components/feedback'
import { Button, ButtonBase } from 'components/inputs'
import { Icon } from 'components/ui'


const NATIVE_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as `0x${string}`

type Tab = 'wallet' | 'manual' | 'card'

// ── Wallet transfer tab ───────────────────────────────────────────────────────

type WalletDepositProps = {
  address: string
  platformAddress: string
  onSuccess: (newBalance: number) => void
}

const WalletDeposit: React.FC<WalletDepositProps> = ({ address, platformAddress, onSuccess }) => {
  const { aaWalletClient } = useWallet()
  const publicClient = usePublicClient()
  const [amount, setAmount] = useState(10)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: usdcBalance } = useBalance({
    address: address as `0x${string}`,
    token: NATIVE_USDC_ADDRESS,
    chainId: polygon.id,
  })

  const balance = usdcBalance ? parseFloat(usdcBalance.formatted) : null

  const handleDeposit = async () => {
    if (isSending || !aaWalletClient || !publicClient) return

    setError(null)
    setIsSending(true)

    try {
      const amountRaw = parseUnits(String(amount), 6)

      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [platformAddress as `0x${string}`, amountRaw],
      })

      await aaWalletClient.switchChain({ id: polygon.id })

      const txHash = await aaWalletClient.sendTransaction({
        account: aaWalletClient.account as any,
        to: NATIVE_USDC_ADDRESS,
        data,
      })

      await publicClient.waitForTransactionReceipt({ hash: txHash })

      const res = await fetch('/api/predikts/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: address, amountUsdc: amount, txHash }),
      })
      const result = await res.json()

      if (result.error) {
        if (result.error.includes('already')) {
          onSuccess(0)
        }
        else {
          setError(result.error)
        }

        return
      }

      onSuccess(result.newBalance)
    }
    catch (err: any) {
      if (err?.message?.includes('User rejected')) {
        setError('Transaction cancelled.')
      }
      else {
        setError(err?.message || 'Transaction failed. Try again.')
      }
    }
    finally {
      setIsSending(false)
    }
  }

  const insufficient = balance !== null && amount > balance

  return (
    <div className="space-y-4">
      <p className="text-caption-13 text-grey-60 leading-5">
        Send native USDC from your connected wallet on Polygon. Your balance is credited the moment the transaction confirms.
      </p>
      {balance !== null && (
        <p className="text-caption-12 text-grey-50">
          Available: <span className="text-grey-90 font-semibold">{balance.toFixed(2)} USDC</span> on Polygon
        </p>
      )}
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
      {insufficient && (
        <p className="text-caption-12 text-red-400">
          Insufficient balance. You have {balance?.toFixed(2)} USDC on Polygon.
        </p>
      )}
      {error && <p className="text-caption-12 text-red-400">{error}</p>}
      <Button
        className="w-full"
        title={isSending ? { en: 'Sending…' } : { en: `Deposit ${amount} USDC` }}
        size={40}
        disabled={isSending || insufficient || amount < 1}
        onClick={handleDeposit}
      />
      {!aaWalletClient && (
        <p className="text-caption-12 text-grey-50 text-center">Connect a wallet to use this option.</p>
      )}
    </div>
  )
}

// ── Manual send tab ───────────────────────────────────────────────────────────

type ManualSendProps = {
  platformAddress: string
  userAddress: string | undefined
  onSuccess: (newBalance: number) => void
}

const ManualSend: React.FC<ManualSendProps> = ({ platformAddress, userAddress, onSuccess }) => {
  const isMounted = useIsMounted()
  const [isCopied, setIsCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

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
    copy(platformAddress)
    setIsCopied(true)
    setTimeout(() => { if (isMounted()) setIsCopied(false) }, 1500)
  }

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
          <QRCode
            className="h-36 w-36 rounded-md bg-white p-2"
            uri={platformAddress}
            size={128}
          />
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
            Buy <strong className="text-grey-90">USDC</strong> on Coinbase or Binance.
            Select <strong className="text-grey-90">Polygon</strong> as the withdrawal network.
          </p>
        </li>
        <li className="flex items-start gap-3 py-3 px-2">
          <span className="flex-none flex items-center justify-center size-6 rounded-md bg-brand-50 text-caption-12 font-semibold text-black">2</span>
          <p className="text-grey-60 leading-5">
            Send to the address below. Your balance updates automatically within a few minutes.
          </p>
        </li>
      </ol>
      <div className="px-3 py-2.5 rounded-md border border-grey-20 text-caption-13 font-medium text-grey-90 break-all">
        {platformAddress}
      </div>
      <div className="flex items-center gap-2">
        <Button
          className="flex-1"
          title={isCopied ? { en: 'Copied!' } : { en: 'Copy Address' }}
          size={40}
          leftIcon={isCopied ? 'interface/accepted' : 'interface/copy'}
          onClick={handleCopy}
        />
        <ButtonBase
          className="flex-none size-10 border border-grey-20 rounded-md p-2 text-grey-60 hover:text-brand-50"
          onClick={() => setShowQR(true)}
        >
          <Icon name="interface/qr_code" className="size-full" />
        </ButtonBase>
      </div>
      {userAddress && (
        <p className="text-caption-12 text-grey-50 text-center">
          {isChecking ? 'Checking for your deposit…' : 'Watching for incoming transfers'}
        </p>
      )}
    </div>
  )
}

// ── Transak card tab ──────────────────────────────────────────────────────────

type CardDepositProps = {
  platformAddress: string
  userAddress: string | undefined
  onSuccess: (newBalance: number) => void
}

const CardDeposit: React.FC<CardDepositProps> = ({ platformAddress, userAddress, onSuccess }) => {
  const isMounted = useIsMounted()
  const transakRef = useRef<any>(null)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_TRANSAK_API_KEY

  // Poll for balance after order is placed (webhook credits the balance server-side)
  useEffect(() => {
    if (!orderPlaced || !userAddress) return

    setIsPolling(true)
    let attempts = 0
    const MAX_ATTEMPTS = 20 // 10 minutes at 30s intervals

    const check = async () => {
      try {
        const res = await fetch(`/api/predikts/balance?address=${userAddress}`)
        const data = await res.json()

        if (data.balance > 0) {
          if (isMounted()) onSuccess(data.balance)

          return
        }
      }
      catch {}

      attempts++

      if (attempts < MAX_ATTEMPTS && isMounted()) {
        setTimeout(check, 30_000)
      }
      else if (isMounted()) {
        setIsPolling(false)
      }
    }

    // First check after 15s (give Transak time to call webhook)
    const timeout = setTimeout(check, 15_000)

    return () => clearTimeout(timeout)
  }, [orderPlaced, userAddress, isMounted, onSuccess])

  // Cleanup Transak widget on unmount
  useEffect(() => {
    return () => { transakRef.current?.cleanup() }
  }, [])

  const openTransak = async () => {
    if (!userAddress || !platformAddress || !apiKey) return

    const { Transak } = await import('@transak/transak-sdk')

    const params = new URLSearchParams({
      apiKey,
      productsAvailed: 'BUY',
      defaultNetwork: 'polygon',
      network: 'polygon',
      cryptoCurrencyCode: 'USDC',
      walletAddress: platformAddress,
      // partnerOrderId maps the purchase back to this user in the webhook
      partnerOrderId: userAddress.toLowerCase(),
      disableWalletAddressForm: 'true',
      defaultFiatAmount: '50',
      themeColor: 'C4FF48',
    })

    const environment = process.env.NEXT_PUBLIC_TRANSAK_ENVIRONMENT ?? 'STAGING'
    const host = environment === 'PRODUCTION' ? 'https://global.transak.com' : 'https://staging-global.transak.com'

    transakRef.current?.cleanup()

    const transak = new Transak({
      widgetUrl: `${host}/?${params.toString()}`,
      referrer: typeof window !== 'undefined' ? window.location.origin : '',
    })

    transakRef.current = transak

    Transak.on(Transak.EVENTS.TRANSAK_ORDER_SUCCESSFUL as any, () => {
      transak.close()
      if (isMounted()) setOrderPlaced(true)
    })

    transak.init()
  }

  if (orderPlaced) {
    return (
      <div className="text-center space-y-3 py-4">
        <div className="inline-flex items-center justify-center size-12 mx-auto rounded-full bg-brand-50/15">
          <Icon name="interface/accepted" className="size-6 text-brand-50" />
        </div>
        <p className="text-caption-14 font-semibold text-grey-90">Order placed!</p>
        <p className="text-caption-13 text-grey-60 leading-5">
          Transak is processing your payment. Your balance will appear here within a few minutes.
        </p>
        {isPolling && (
          <p className="text-caption-12 text-grey-50">Watching for confirmation…</p>
        )}
      </div>
    )
  }

  if (!apiKey) {
    return (
      <p className="text-caption-12 text-red-400 text-center py-4">
        Card payments are not configured yet. Try another deposit method.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-caption-13 text-grey-60 leading-5">
        Buy USDC with a credit card, debit card, or bank transfer. No crypto exchange needed.
      </p>
      <ol className="bg-bg-l3 rounded-md text-caption-13 divide-y divide-grey-20">
        <li className="flex items-start gap-3 py-3 px-2">
          <span className="flex-none flex items-center justify-center size-6 rounded-md bg-brand-50 text-caption-12 font-semibold text-black">1</span>
          <p className="text-grey-60 leading-5">
            Click below — Transak opens. Enter your amount and card details.
          </p>
        </li>
        <li className="flex items-start gap-3 py-3 px-2">
          <span className="flex-none flex items-center justify-center size-6 rounded-md bg-brand-50 text-caption-12 font-semibold text-black">2</span>
          <p className="text-grey-60 leading-5">
            Transak converts your payment to USDC and credits your Predikts balance automatically.
          </p>
        </li>
      </ol>
      <p className="text-caption-12 text-grey-50">Fees: 1–3.5% depending on payment method and region. Transak handles KYC.</p>
      {!userAddress && (
        <p className="text-caption-12 text-grey-50 text-center">Connect a wallet to use this option.</p>
      )}
      <Button
        className="w-full"
        title={{ en: 'Buy with Card' }}
        size={40}
        disabled={!userAddress || !platformAddress}
        onClick={openTransak}
      />
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

const PrediktsDepositModal: ModalComponent = ({ closeModal }) => {
  const { account: address } = useWallet()
  const [tab, setTab] = useState<Tab>('wallet')
  const [successBalance, setSuccessBalance] = useState<number | null>(null)
  const [platformAddress, setPlatformAddress] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/predikts/deposit')
      .then((r) => r.json())
      .then((d) => { if (d.depositAddress) setPlatformAddress(d.depositAddress) })
      .catch(() => {})
  }, [])

  if (successBalance !== null) {
    return (
      <PlainModal className="ds:max-w-[480px]" withCloseButton closeModal={closeModal}>
        <div className="text-center py-4 space-y-3">
          <div className="inline-flex items-center justify-center size-14 mx-auto rounded-full bg-green-500/15">
            <Icon name="interface/accepted" className="size-7 text-green-400" />
          </div>
          <h3 className="text-heading-h2 font-bold text-grey-90">Deposit received!</h3>
          <p className="text-caption-14 text-grey-60">
            Your new Predikt Markets balance is{' '}
            <strong className="text-grey-90">${successBalance.toFixed(2)} pUSD</strong>.
          </p>
          <Button className="w-full mt-2" title={{ en: 'Done' }} size={40} onClick={() => closeModal()} />
        </div>
      </PlainModal>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'wallet', label: 'From Wallet' },
    { id: 'manual', label: 'From Exchange' },
    { id: 'card', label: 'Buy with Card' },
  ]

  return (
    <PlainModal className="ds:max-w-[480px]" withCloseButton closeModal={closeModal}>
      <div className="mb-4">
        <h3 className="text-heading-h2 font-bold text-grey-90">Add Funds</h3>
        <p className="mt-1 text-caption-13 text-grey-60">Fund your Predikt Markets balance with USDC.</p>
      </div>

      <div className="flex rounded-md bg-bg-l3 p-0.5 mb-4">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            className={`flex-1 py-1.5 text-caption-12 font-semibold rounded-[5px] transition-colors ${tab === id ? 'bg-bg-l1 text-grey-90' : 'text-grey-60 hover:text-grey-90'}`}
            type="button"
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {!platformAddress ? (
        <div className="bone h-32 rounded-md" />
      ) : tab === 'wallet' ? (
        <WalletDeposit
          address={address as string}
          platformAddress={platformAddress}
          onSuccess={setSuccessBalance}
        />
      ) : tab === 'manual' ? (
        <ManualSend
          platformAddress={platformAddress}
          userAddress={address as string | undefined}
          onSuccess={setSuccessBalance}
        />
      ) : (
        <CardDeposit
          platformAddress={platformAddress}
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
