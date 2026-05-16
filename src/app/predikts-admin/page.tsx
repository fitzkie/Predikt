'use client'

import { useState } from 'react'


type Result = Record<string, any>

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="border border-white/10 rounded-xl p-5 space-y-3">
    <h2 className="text-caption-14 font-bold text-grey-90">{title}</h2>
    {children}
  </div>
)

const ResultBox: React.FC<{ result: Result | null; loading: boolean }> = ({ result, loading }) => {
  if (loading) return <div className="text-caption-12 text-grey-50 font-mono">Loading…</div>
  if (!result) return null

  return (
    <pre className="text-[11px] font-mono text-grey-60 bg-black/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
      {JSON.stringify(result, null, 2)}
    </pre>
  )
}

export default function PrediktsAdminPage() {
  const [ results, setResults ] = useState<Record<string, Result | null>>({})
  const [ loading, setLoading ] = useState<Record<string, boolean>>({})

  const run = async (key: string, method: 'GET' | 'POST', url: string, body?: object) => {
    setLoading((p) => ({ ...p, [key]: true }))
    setResults((p) => ({ ...p, [key]: null }))

    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json()

      setResults((p) => ({ ...p, [key]: data }))
    }
    catch (e) {
      setResults((p) => ({ ...p, [key]: { error: String(e) } }))
    }
    finally {
      setLoading((p) => ({ ...p, [key]: false }))
    }
  }

  const btn = (label: string, disabled = false) =>
    `px-4 py-2 rounded-lg text-caption-13 font-semibold transition-colors ${disabled ? 'bg-grey-10 text-grey-50 cursor-not-allowed' : 'bg-brand-50 text-black hover:bg-brand-50/90'}`

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-heading-h2 font-bold text-grey-90">Predikts Admin</h1>
        <p className="mt-1 text-caption-13 text-grey-60">One-time platform wallet setup. Run steps 1–4 in order.</p>
      </div>

      {/* Step 1 */}
      <Section title="Step 1 — Check platform wallet status">
        <p className="text-caption-12 text-grey-60">See the wallet address, on-chain balances, and whether CLOB credentials are set.</p>
        <button className={btn('Check status')} onClick={() => run('status', 'GET', '/api/predikts/setup')}>
          Check Status
        </button>
        <ResultBox result={results['status'] ?? null} loading={!!loading['status']} />
      </Section>

      {/* Step 2 */}
      <Section title="Step 2 — Derive CLOB API credentials">
        <p className="text-caption-12 text-grey-60 leading-5">
          Signs with the platform wallet to create Polymarket API credentials.
          Copy the <code className="text-brand-50">key</code>, <code className="text-brand-50">secret</code>, and <code className="text-brand-50">passphrase</code> values
          and add them as Railway env vars: <strong className="text-grey-90">PLATFORM_CLOB_KEY</strong>, <strong className="text-grey-90">PLATFORM_CLOB_SECRET</strong>, <strong className="text-grey-90">PLATFORM_CLOB_PASSPHRASE</strong>. Then redeploy.
        </p>
        <button className={btn('Derive credentials')} onClick={() => run('creds', 'POST', '/api/predikts/setup', { action: 'derive-credentials' })}>
          Derive Credentials
        </button>
        <ResultBox result={results['creds'] ?? null} loading={!!loading['creds']} />
      </Section>

      {/* Step 3 */}
      <Section title="Step 3 — Approve exchange contracts">
        <p className="text-caption-12 text-grey-60 leading-5">
          Sends 3 on-chain transactions approving Polymarket's exchange contracts to spend pUSD from the platform wallet.
          Requires MATIC for gas.
        </p>
        <button className={btn('Approve exchanges')} onClick={() => run('approve', 'POST', '/api/predikts/setup', { action: 'approve-exchanges' })}>
          Approve Exchanges
        </button>
        <ResultBox result={results['approve'] ?? null} loading={!!loading['approve']} />
      </Section>

      {/* Step 4 */}
      <Section title="Step 4 — Wrap USDC → pUSD">
        <p className="text-caption-12 text-grey-60 leading-5">
          Converts native USDC in the platform wallet to pUSD (Polymarket's collateral token).
          The platform wallet must hold native USDC on Polygon before running this.
        </p>
        <div className="flex items-center gap-3">
          <input
            id="wrap-amount"
            className="w-28 rounded-lg border border-white/10 bg-bg-l3 px-3 py-2 text-caption-13 text-grey-90 outline-none"
            defaultValue="50"
            min="1"
            placeholder="Amount"
            type="number"
          />
          <span className="text-caption-12 text-grey-60">USDC</span>
          <button
            className={btn('Wrap')}
            onClick={() => {
              const amount = Number((document.getElementById('wrap-amount') as HTMLInputElement)?.value || 50)
              run('wrap', 'POST', '/api/predikts/setup', { action: 'wrap-usdc', amount })
            }}
          >
            Wrap USDC → pUSD
          </button>
        </div>
        <ResultBox result={results['wrap'] ?? null} loading={!!loading['wrap']} />
      </Section>

      {/* Manual balance credit */}
      <Section title="Credit a user balance (manual deposit)">
        <p className="text-caption-12 text-grey-60 leading-5">
          After a user sends USDC to the platform wallet, credit their account here.
          Use the on-chain transaction hash as proof of deposit.
        </p>
        <div className="space-y-2">
          <input
            id="credit-address"
            className="w-full rounded-lg border border-white/10 bg-bg-l3 px-3 py-2 text-caption-13 text-grey-90 outline-none"
            placeholder="User wallet address (0x...)"
            type="text"
          />
          <div className="flex gap-2">
            <input
              id="credit-amount"
              className="w-28 rounded-lg border border-white/10 bg-bg-l3 px-3 py-2 text-caption-13 text-grey-90 outline-none"
              defaultValue="10"
              min="0"
              placeholder="Amount"
              type="number"
            />
            <input
              id="credit-txhash"
              className="flex-1 rounded-lg border border-white/10 bg-bg-l3 px-3 py-2 text-caption-13 text-grey-90 outline-none"
              placeholder="TX hash (or any unique ID)"
              type="text"
            />
          </div>
          <button
            className={btn('Credit balance')}
            onClick={() => {
              const userAddress = (document.getElementById('credit-address') as HTMLInputElement)?.value
              const amountUsdc = Number((document.getElementById('credit-amount') as HTMLInputElement)?.value)
              const txHash = (document.getElementById('credit-txhash') as HTMLInputElement)?.value || `manual-${Date.now()}`
              run('credit', 'POST', '/api/predikts/deposit', { userAddress, amountUsdc, txHash })
            }}
          >
            Credit User Balance
          </button>
        </div>
        <ResultBox result={results['credit'] ?? null} loading={!!loading['credit']} />
      </Section>
    </div>
  )
}
