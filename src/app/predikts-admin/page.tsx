'use client'

import { useEffect, useState } from 'react'


type Result = Record<string, any>

type PrediktsStats = {
  platformPUsdBalance: number | null
  platformUsdcBalance: number | null
  depositWalletPusdBalance: number | null
  totalBetters: number
  totalOrders: number
  totalBetAmount: number
  totalPayouts: number
}

type SportsStats = {
  totalBetters: number
  totalBets: number
  totalBetAmount: number
  totalPayouts: number
}

const Section: React.FC<{ title: string; children: React.ReactNode; collapsed?: boolean }> = ({ title, children, collapsed }) => {
  const [ open, setOpen ] = useState(!collapsed)

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        type="button"
        onClick={() => setOpen((o) => !o)}
      >
        <h2 className="text-caption-14 font-bold text-grey-90">{title}</h2>
        <span className="text-grey-50 text-caption-12">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-5 pb-5 space-y-3">{children}</div>}
    </div>
  )
}

const ResultBox: React.FC<{ result: Result | null; loading: boolean }> = ({ result, loading }) => {
  if (loading) return <div className="text-caption-12 text-grey-50 font-mono">Loading…</div>
  if (!result) return null

  return (
    <pre className="text-[11px] font-mono text-grey-60 bg-black/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
      {JSON.stringify(result, null, 2)}
    </pre>
  )
}

const StatCard: React.FC<{ label: string; value: string | number | null; sub?: string; warn?: boolean }> = ({ label, value, sub, warn }) => (
  <div className={`bg-bg-l3 rounded-lg px-4 py-3 ${warn ? 'ring-1 ring-yellow-500/40' : ''}`}>
    <p className="text-caption-11 text-grey-50 uppercase tracking-wide">{label}</p>
    <p className={`text-heading-h3 font-bold mt-0.5 ${warn ? 'text-yellow-400' : 'text-grey-90'}`}>
      {value === null ? '–' : value}
    </p>
    {sub && <p className="text-caption-11 text-grey-50 mt-0.5">{sub}</p>}
  </div>
)

export default function PrediktsAdminPage() {
  const [ results, setResults ] = useState<Record<string, Result | null>>({})
  const [ loading, setLoading ] = useState<Record<string, boolean>>({})
  const [ prediktsStats, setPrediktsStats ] = useState<PrediktsStats | null>(null)
  const [ sportsStats, setSportsStats ] = useState<SportsStats | null>(null)
  const [ statsLoading, setStatsLoading ] = useState(true)

  const loadStats = () => {
    setStatsLoading(true)
    Promise.all([
      fetch('/api/predikts/stats').then((r) => r.json()).catch(() => null),
      fetch('/api/bet/stats').then((r) => r.json()).catch(() => null),
    ]).then(([ ps, ss ]) => {
      if (ps && !ps.error) setPrediktsStats(ps)
      if (ss && !ss.error) setSportsStats(ss)
    }).finally(() => setStatsLoading(false))
  }

  useEffect(() => { loadStats() }, [])

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

  const fmt = (n: number, decimals = 2) => n.toLocaleString('en-US', { maximumFractionDigits: decimals })

  const depositWalletPusd = prediktsStats?.depositWalletPusdBalance ?? null
  const eoaUsdc = prediktsStats?.platformUsdcBalance ?? null
  const unwrappedPending = eoaUsdc !== null && eoaUsdc >= 1

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
      <div>
        <h1 className="text-heading-h2 font-bold text-grey-90">Predikts Admin</h1>
        <p className="mt-1 text-caption-13 text-grey-60">Platform wallet management and trading setup.</p>
      </div>

      {/* Platform Stats */}
      <Section title="Platform Stats — Predikt Markets">
        {statsLoading ? (
          <p className="text-caption-12 text-grey-50">Loading stats…</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label="Deposit wallet pUSD"
                value={depositWalletPusd !== null ? `$${fmt(depositWalletPusd)} pUSD` : null}
                sub="Trading collateral"
              />
              <StatCard
                label="EOA USDC (unwrapped)"
                value={eoaUsdc !== null ? `$${fmt(eoaUsdc)} USDC` : null}
                sub={unwrappedPending ? 'Run auto-wrap!' : 'On platform EOA'}
                warn={unwrappedPending}
              />
              <StatCard
                label="Total betters"
                value={prediktsStats ? prediktsStats.totalBetters : null}
                sub="Unique wallets"
              />
              <StatCard
                label="Total bets placed"
                value={prediktsStats ? prediktsStats.totalOrders : null}
                sub="Orders submitted"
              />
              <StatCard
                label="Total bet amount"
                value={prediktsStats ? `$${fmt(prediktsStats.totalBetAmount)} pUSD` : null}
              />
              <StatCard
                label="Total payouts"
                value={prediktsStats ? `$${fmt(prediktsStats.totalPayouts)} pUSD` : null}
                sub="SELL orders processed"
              />
            </div>
            <button className={btn('Refresh')} onClick={loadStats}>
              Refresh Stats
            </button>
          </div>
        )}
      </Section>

      {/* Sports Stats */}
      <Section title="Platform Stats — Sports Betting (/bet)">
        {statsLoading ? (
          <p className="text-caption-12 text-grey-50">Loading stats…</p>
        ) : sportsStats ? (
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Total betters" value={sportsStats.totalBetters} sub="Unique wallets" />
            <StatCard label="Total bets" value={sportsStats.totalBets} />
            <StatCard label="Total bet amount" value={`$${fmt(sportsStats.totalBetAmount)} USDT`} />
            <StatCard label="Total payouts" value={`$${fmt(sportsStats.totalPayouts)} USDT`} />
          </div>
        ) : (
          <p className="text-caption-12 text-grey-50">Sports stats unavailable (check NEXT_PUBLIC_AFFILIATE_ADDRESS env var).</p>
        )}
      </Section>

      {/* Deposit Wallet Setup (new, required) */}
      <Section title="Deposit Wallet Setup (one-time, required for trading)">
        <p className="text-caption-12 text-grey-60 leading-5">
          This is <strong className="text-grey-90">your platform&apos;s single trading proxy</strong> on Polymarket — one wallet shared by all users.
          Polymarket requires it since April 2026. Run A → E once, then ignore forever.
        </p>

        <div className="space-y-3">
          <div>
            <p className="text-caption-12 text-grey-90 font-semibold mb-1">A — Create builder API key (relayer auth)</p>
            <p className="text-caption-11 text-grey-50 mb-2">
              The Polymarket relayer needs separate builder credentials to deploy the deposit wallet.
              Click once, copy the three values, and add them as Railway env vars:
              <strong className="text-grey-90"> PLATFORM_BUILDER_KEY</strong>,{' '}
              <strong className="text-grey-90">PLATFORM_BUILDER_SECRET</strong>,{' '}
              <strong className="text-grey-90">PLATFORM_BUILDER_PASSPHRASE</strong>. Then redeploy and continue to step B.
            </p>
            <button className={btn('Create Key')} onClick={() => run('builder-key', 'POST', '/api/predikts/setup', { action: 'create-builder-api-key' })}>
              Create Builder API Key
            </button>
            <ResultBox result={results['builder-key'] ?? null} loading={!!loading['builder-key']} />
          </div>

          <div>
            <p className="text-caption-12 text-grey-90 font-semibold mb-1">B — Deploy the platform deposit wallet</p>
            <p className="text-caption-11 text-grey-50 mb-2">Check first. If <code>deployed: false</code>, click Deploy. Takes 30–60s to confirm on-chain.</p>
            <div className="flex gap-2">
              <button className={btn('Check')} onClick={() => run('dw-check', 'POST', '/api/predikts/setup', { action: 'check-deposit-wallet' })}>
                Check Status
              </button>
              <button className={btn('Deploy')} onClick={() => run('dw-deploy', 'POST', '/api/predikts/setup', { action: 'deploy-deposit-wallet' })}>
                Deploy Wallet
              </button>
            </div>
            <ResultBox result={results['dw-check'] ?? null} loading={!!loading['dw-check']} />
            <ResultBox result={results['dw-deploy'] ?? null} loading={!!loading['dw-deploy']} />
          </div>

          <div>
            <p className="text-caption-12 text-grey-90 font-semibold mb-1">C — Approve exchange contracts from deposit wallet</p>
            <p className="text-caption-11 text-grey-50 mb-2">
              Approves CTF Exchange V2, NegRisk Exchange V2, and NegRisk Adapter to spend pUSD from the deposit wallet.
            </p>
            <button className={btn('Approve')} onClick={() => run('dw-approve', 'POST', '/api/predikts/setup', { action: 'approve-from-deposit-wallet' })}>
              Approve Exchanges
            </button>
            <ResultBox result={results['dw-approve'] ?? null} loading={!!loading['dw-approve']} />
          </div>

          <div>
            <p className="text-caption-12 text-grey-90 font-semibold mb-1">D — Migrate existing EOA pUSD to deposit wallet (one-time)</p>
            <p className="text-caption-11 text-grey-50 mb-2">
              If the EOA has pUSD from before the deposit-wallet switch, transfer it here.
            </p>
            <button className={btn('Transfer')} onClick={() => run('dw-transfer', 'POST', '/api/predikts/setup', { action: 'transfer-pusd-to-deposit-wallet' })}>
              Transfer pUSD → Deposit Wallet
            </button>
            <ResultBox result={results['dw-transfer'] ?? null} loading={!!loading['dw-transfer']} />
          </div>

          <div>
            <p className="text-caption-12 text-grey-90 font-semibold mb-1">E — Register balance with CLOB</p>
            <p className="text-caption-11 text-grey-50 mb-2">
              After any wrap or transfer, tell the CLOB to re-read on-chain balances.
            </p>
            <button className={btn('Update CLOB')} onClick={() => run('clobupdate', 'POST', '/api/predikts/setup', { action: 'update-clob-balance' })}>
              Update CLOB Balance
            </button>
            <ResultBox result={results['clobupdate'] ?? null} loading={!!loading['clobupdate']} />
          </div>
        </div>
      </Section>

      {/* DB Setup */}
      <Section title="Database — Create Tables" collapsed>
        <p className="text-caption-12 text-grey-60">Run once on a fresh database. Safe to re-run — uses CREATE TABLE IF NOT EXISTS.</p>
        <button className={btn('Create Tables')} onClick={() => run('migrate', 'POST', '/api/predikts/migrate')}>
          Create Tables
        </button>
        <ResultBox result={results['migrate'] ?? null} loading={!!loading['migrate']} />
      </Section>

      {/* Step 1 */}
      <Section title="Step 1 — Check platform wallet status" collapsed>
        <p className="text-caption-12 text-grey-60">See the wallet address, on-chain balances, deposit wallet status, and CLOB credentials.</p>
        <button className={btn('Check status')} onClick={() => run('status', 'GET', '/api/predikts/setup')}>
          Check Status
        </button>
        <ResultBox result={results['status'] ?? null} loading={!!loading['status']} />
      </Section>

      {/* Step 2 */}
      <Section title="Step 2 — Derive CLOB API credentials" collapsed>
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

      {/* Step 4 */}
      <Section title="Wrap USDC → pUSD (manual)" collapsed>
        <p className="text-caption-12 text-grey-60 leading-5">
          Converts native USDC in the platform wallet to pUSD, minted directly to the deposit wallet.
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
      <Section title="Credit a user balance (manual deposit)" collapsed>
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
