'use client'

import { type ModalComponent } from '@locmod/modal'
import { useEffect, useState } from 'react'
import copy from 'copy-to-clipboard'
import { useWallet } from 'wallet'

import { PlainModal } from 'components/feedback'
import { Button } from 'components/inputs'
import { Icon } from 'components/ui'


const PrediktsWithdrawModal: ModalComponent = ({ closeModal }) => {
  const { account: address } = useWallet()
  const [token, setToken] = useState<'USDC' | 'USDT'>('USDC')
  const [amount, setAmount] = useState('')
  const [toAddress, setToAddress] = useState(address ?? '')
  const [balance, setBalance] = useState<number | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ txHash: string; newBalance: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [txCopied, setTxCopied] = useState(false)

  useEffect(() => {
    if (!address) return

    fetch(`/api/predikts/balance?address=${address}`)
      .then((r) => r.json())
      .then((d) => setBalance(typeof d.balance === 'number' ? d.balance : 0))
      .catch(() => setBalance(0))
  }, [address])

  useEffect(() => {
    if (address) setToAddress(address)
  }, [address])

  const numericAmount = parseFloat(amount) || 0
  const isInsufficient = balance !== null && numericAmount > balance
  const isValidAddress = /^0x[0-9a-fA-F]{40}$/.test(toAddress)
  const canSubmit = numericAmount > 0 && !isInsufficient && isValidAddress && !isSubmitting

  const handleSubmit = async () => {
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/account/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: toAddress, amountUsd: numericAmount, token }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Withdrawal failed')

      setResult({ txHash: data.txHash, newBalance: Number(data.newBalance ?? 0) })
    }
    catch (err: any) {
      setError(err?.message || 'Withdrawal failed. Try again.')
    }
    finally {
      setSubmitting(false)
    }
  }

  const handleCopyTx = () => {
    if (!result?.txHash) return
    copy(result.txHash)
    setTxCopied(true)
    setTimeout(() => setTxCopied(false), 1500)
  }

  const setMax = () => {
    if (balance !== null) setAmount(balance.toFixed(2))
  }

  if (result) {
    return (
      <PlainModal className="ds:max-w-[440px]" withCloseButton closeModal={closeModal}>
        <div className="text-center py-4 space-y-3">
          <div className="inline-flex items-center justify-center size-14 mx-auto rounded-full bg-green-500/15">
            <Icon name="interface/accepted" className="size-7 text-green-400" />
          </div>
          <h3 className="text-heading-h2 font-bold text-grey-90">Withdrawal sent!</h3>
          <p className="text-caption-14 text-grey-60">
            <strong className="text-grey-90">${numericAmount.toFixed(2)} {token}</strong> is on its way to your wallet.
            Remaining balance: <strong className="text-grey-90">${result.newBalance.toFixed(2)} pUSD</strong>
          </p>
          {result.txHash && (
            <button
              className="flex items-center gap-2 mx-auto text-caption-12 text-grey-50 hover:text-grey-90 transition-colors"
              onClick={handleCopyTx}
              type="button"
            >
              <span className="font-mono truncate max-w-[240px]">{result.txHash.slice(0, 16)}…{result.txHash.slice(-8)}</span>
              <Icon name={txCopied ? 'interface/accepted' : 'interface/copy'} className="size-3.5 flex-none" />
            </button>
          )}
          <Button className="w-full mt-2" title={{ en: 'Done' }} size={40} onClick={() => closeModal()} />
        </div>
      </PlainModal>
    )
  }

  return (
    <PlainModal className="ds:max-w-[440px]" withCloseButton closeModal={closeModal}>
      <div className="mb-5">
        <h3 className="text-heading-h2 font-bold text-grey-90">Withdraw</h3>
        <p className="mt-1 text-caption-13 text-grey-60">
          Send your pUSD balance to any Polygon wallet as USDC or USDT.
        </p>
      </div>

      {/* pUSD balance */}
      <div className="rounded-lg bg-bg-l3 px-4 py-3 mb-4 flex items-center justify-between">
        <span className="text-caption-13 text-grey-60">Available pUSD</span>
        <span className="text-caption-13 font-semibold text-grey-90">
          {balance === null ? '…' : `$${balance.toFixed(2)} pUSD`}
        </span>
      </div>

      {/* Token selector */}
      <p className="text-caption-12 text-grey-60 mb-1.5">Receive as</p>
      <div className="flex rounded-md bg-bg-l3 p-0.5 mb-4">
        {(['USDC', 'USDT'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`flex-1 py-1.5 text-caption-12 font-semibold rounded-[5px] transition-colors ${token === t ? 'bg-bg-l1 text-grey-90' : 'text-grey-60 hover:text-grey-90'}`}
            onClick={() => setToken(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Amount */}
      <p className="text-caption-12 text-grey-60 mb-1.5">Amount (pUSD)</p>
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-caption-13 text-grey-60">$</span>
        <input
          className="w-full rounded-md border border-grey-20 bg-bg-l3 pl-6 pr-14 py-2.5 text-caption-13 text-grey-90 outline-none focus:border-brand-50 transition-colors"
          type="number"
          min={0}
          step={0.01}
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 text-caption-11 font-semibold text-brand-50 hover:text-brand-50/80"
          type="button"
          onClick={setMax}
        >
          MAX
        </button>
      </div>
      {isInsufficient && (
        <p className="text-caption-12 text-red-400 -mt-3 mb-3">Amount exceeds your pUSD balance.</p>
      )}

      {/* Destination address */}
      <p className="text-caption-12 text-grey-60 mb-1.5">To (Polygon address)</p>
      <input
        className="w-full rounded-md border border-grey-20 bg-bg-l3 px-3 py-2.5 text-caption-13 text-grey-90 outline-none focus:border-brand-50 transition-colors mb-1 font-mono"
        type="text"
        placeholder="0x…"
        value={toAddress}
        onChange={(e) => setToAddress(e.target.value.trim())}
      />
      {toAddress && !isValidAddress && (
        <p className="text-caption-12 text-red-400 mb-3">Enter a valid 0x Polygon address.</p>
      )}

      <p className="text-caption-11 text-grey-50 mb-5 mt-2">
        Funds arrive on Polygon as {token}. Transfers are on-chain and irreversible.
      </p>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-caption-12 text-red-400 mb-4">
          {error}
        </div>
      )}

      <Button
        className="w-full"
        title={isSubmitting ? { en: 'Sending…' } : { en: `Withdraw${numericAmount > 0 ? ` $${numericAmount.toFixed(2)}` : ''} as ${token}` }}
        size={40}
        disabled={!canSubmit}
        loading={isSubmitting}
        onClick={handleSubmit}
      />
    </PlainModal>
  )
}

declare global {
  interface ModalsRegistry extends ExtendModalsRegistry<{ PrediktsWithdrawModal: typeof PrediktsWithdrawModal }> {}
}

export default PrediktsWithdrawModal
