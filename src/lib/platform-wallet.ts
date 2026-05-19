// SERVER-ONLY — never import this from client components.
// Contains the platform private key used for all Polymarket trades.

import { createWalletClient, http, fallback, encodeFunctionData, maxUint256, createPublicClient } from 'viem'
import { polygon } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { ClobClient, Chain, SignatureTypeV2, OrderType, Side } from '@polymarket/clob-client-v2'
import { RelayClient, deriveDepositWallet } from '@polymarket/builder-relayer-client'
import { BuilderConfig } from '@polymarket/builder-signing-sdk'


// Contract addresses on Polygon for Polymarket V2
const PUSD_ADDRESS = '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB' as `0x${string}`
const NATIVE_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as `0x${string}`
const USDC_E_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`
const CTF_EXCHANGE_V2 = '0xE111180000d2663C0091e4f400237545B87B996B' as `0x${string}`
const NEG_RISK_EXCHANGE_V2 = '0xe2222d279d744050d28e00520010520000310F59' as `0x${string}`
const NEG_RISK_ADAPTER = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296' as `0x${string}`
// Conditional Token Framework — ERC1155 outcome tokens (setApprovalForAll required to SELL)
const CTF_CONTRACT = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045' as `0x${string}`
// CollateralOnramp: approve it for USDC, then call wrap(asset, to, amount) to mint pUSD 1:1
const COLLATERAL_ONRAMP = '0x93070a847efEf7F70739046A929D47a521F5B8ee' as `0x${string}`

// Polymarket deposit wallet contracts on Polygon (required since CTF Exchange V2, April 2026)
const DEPOSIT_WALLET_FACTORY = '0x00000000000Fb5C9ADea0298D729A0CB3823Cc07' as `0x${string}`
const DEPOSIT_WALLET_IMPLEMENTATION = '0x58CA52ebe0DadfdF531Cde7062e76746de4Db1eB' as `0x${string}`

const RELAYER_URL = 'https://relayer-v2.polymarket.com'
const POLYGON_CHAIN_ID = 137

// The Amsterdam proxy bypasses Polymarket's geo-block on Railway's US IP.
const CLOB_HOST = 'http://188.166.103.169:3001'

// Set POLYGON_RPC_URL in Railway to a dedicated Alchemy/QuickNode endpoint.
// Falls back through several truly-free public RPCs if not set.
const polygonTransport = process.env.POLYGON_RPC_URL
  ? http(process.env.POLYGON_RPC_URL)
  : fallback([
    http('https://polygon-bor-rpc.publicnode.com'),
    http('https://polygon.llamarpc.com'),
    http('https://1rpc.io/matic'),
  ])

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'transfer',
    type: 'function',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const


const ERC1155_ABI = [
  {
    name: 'setApprovalForAll',
    type: 'function',
    inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

// CollateralOnramp: approve it for USDC, then call wrap(asset, to, amount) to mint pUSD 1:1
const COLLATERAL_ONRAMP_ABI = [
  {
    name: 'wrap',
    type: 'function',
    inputs: [
      { name: '_asset', type: 'address' },
      { name: '_to', type: 'address' },
      { name: '_amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'paused',
    type: 'function',
    inputs: [{ name: '_asset', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const

function getPlatformAccount() {
  const privateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY

  if (!privateKey) {
    throw new Error('PLATFORM_WALLET_PRIVATE_KEY env var is not set.')
  }

  return privateKeyToAccount(privateKey as `0x${string}`)
}

function getPlatformWalletClient() {
  const account = getPlatformAccount()

  return createWalletClient({
    account,
    chain: polygon,
    transport: polygonTransport,
  })
}

export function getPublicClient() {
  return createPublicClient({
    chain: polygon,
    transport: polygonTransport,
  })
}

export function getPlatformAddress(): string {
  return getPlatformAccount().address.toLowerCase()
}

// Derive the deterministic ERC-1967 deposit wallet address for the platform EOA.
// Pure / synchronous — uses CREATE2 math, no network call needed.
export function getPlatformDepositWalletAddress(): string {
  const account = getPlatformAccount()

  return deriveDepositWallet(account.address, DEPOSIT_WALLET_FACTORY, DEPOSIT_WALLET_IMPLEMENTATION)
}

function getClobCredentials() {
  const key = process.env.PLATFORM_CLOB_KEY
  const secret = process.env.PLATFORM_CLOB_SECRET
  const passphrase = process.env.PLATFORM_CLOB_PASSPHRASE

  if (!key || !secret || !passphrase) {
    return undefined
  }

  return { key, secret, passphrase }
}

function getBuilderCredentials() {
  const key = process.env.PLATFORM_BUILDER_KEY
  const secret = process.env.PLATFORM_BUILDER_SECRET
  const passphrase = process.env.PLATFORM_BUILDER_PASSPHRASE

  if (!key || !secret || !passphrase) return undefined
  return { key, secret, passphrase }
}

function createRelayClient() {
  const walletClient = getPlatformWalletClient()
  const creds = getBuilderCredentials()

  if (!creds) {
    throw new Error(
      'Builder credentials not configured. In the admin panel, run "Create Builder API Key" and add '
      + 'PLATFORM_BUILDER_KEY, PLATFORM_BUILDER_SECRET, PLATFORM_BUILDER_PASSPHRASE to your Railway env vars, then redeploy.',
    )
  }

  const builderConfig = new BuilderConfig({ localBuilderCreds: creds })

  return new RelayClient(RELAYER_URL, POLYGON_CHAIN_ID, walletClient as any, builderConfig)
}

// Uses POLY_1271 signature type with deposit wallet as funder — required since April 2026.
function createClobClient(withCredentials = true) {
  const walletClient = getPlatformWalletClient()
  const creds = withCredentials ? getClobCredentials() : undefined
  const builderCode = process.env.NEXT_PUBLIC_POLYMARKET_BUILDER_CODE

  return new ClobClient({
    host: CLOB_HOST,
    chain: Chain.POLYGON,
    signer: walletClient as any,
    signatureType: SignatureTypeV2.POLY_1271,
    funderAddress: getPlatformDepositWalletAddress(),
    creds,
    useServerTime: true,
    throwOnError: true,
    builderConfig: builderCode ? { builderCode } : undefined,
  })
}

// Derive and return CLOB API credentials for the platform wallet.
// Call this once during setup, then store the result as env vars on Railway.
export async function derivePlatformCredentials() {
  const client = createClobClient(false)
  let creds

  try {
    creds = await client.createOrDeriveApiKey()
  }
  catch {
    creds = await client.deriveApiKey()
  }

  return { key: creds.key, secret: creds.secret, passphrase: creds.passphrase }
}

// Create a builder API key for the platform wallet via the CLOB API.
// Builder credentials are separate from CLOB credentials and are required to authenticate
// with the Polymarket relayer when deploying the deposit wallet.
// Call this once, then store PLATFORM_BUILDER_KEY/SECRET/PASSPHRASE in Railway.
export async function createBuilderApiKey() {
  const client = createClobClient(true)
  const result = await (client as any).createBuilderApiKey()

  return { key: result.key, secret: result.secret, passphrase: result.passphrase }
}

// Check whether the platform deposit wallet is deployed on-chain.
// Reads bytecode at the deterministic address — non-empty = deployed.
export async function checkDepositWalletDeployed(): Promise<boolean> {
  const publicClient = getPublicClient()
  const depositWalletAddress = getPlatformDepositWalletAddress() as `0x${string}`
  const code = await publicClient.getCode({ address: depositWalletAddress })

  return !!code && code !== '0x'
}

// Deploy the platform deposit wallet via Polymarket's relayer.
// Requires PLATFORM_BUILDER_KEY/SECRET/PASSPHRASE — run "Create Builder API Key" in the admin panel first.
// One-time setup — safe to call multiple times (no-op if already deployed).
export async function deployPlatformDepositWallet() {
  const depositWalletAddress = getPlatformDepositWalletAddress()
  const already = await checkDepositWalletDeployed()

  if (already) {
    return { transactionId: null, hash: null, deployed: true, depositWalletAddress, note: 'Already deployed' }
  }

  const relayClient = createRelayClient()
  const response = await relayClient.deployDepositWallet()

  // Return immediately — don't wait for confirmation (relayer can take 30–60s).
  // The admin panel "Check Status" button calls checkDepositWalletDeployed() to verify.
  return {
    transactionId: response.transactionID,
    hash: response.transactionHash || null,
    deployed: false,
    depositWalletAddress,
  }
}


// Approve CTF_EXCHANGE_V2, NEG_RISK_EXCHANGE_V2, and NEG_RISK_ADAPTER to spend pUSD
// from the DEPOSIT WALLET (required after April 2026 — EOA approvals are no longer accepted).
// Must go through the Polymarket relayer — factory.executeBatch() also requires DEPLOYER_ROLE.
export async function approveExchangesFromDepositWallet() {
  const spenders = [CTF_EXCHANGE_V2, NEG_RISK_EXCHANGE_V2, NEG_RISK_ADAPTER] as const
  const depositWalletAddress = getPlatformDepositWalletAddress()
  const deadline = String(Math.floor(Date.now() / 1000) + 600)

  const calls = spenders.map((spender) => ({
    target: PUSD_ADDRESS,
    value: '0',
    data: encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [spender, maxUint256] }),
  }))

  const relayClient = createRelayClient()
  const response = await relayClient.executeDepositWalletBatch(calls, depositWalletAddress, deadline)

  return {
    transactionId: response.transactionID,
    hash: response.transactionHash || null,
    spenders,
  }
}

// Approve CTF_EXCHANGE_V2, NEG_RISK_EXCHANGE_V2, and NEG_RISK_ADAPTER as ERC1155 operators
// on the CTF contract from the deposit wallet. Required to SELL conditional tokens (outcome shares).
// Separate from the pUSD ERC20 approvals — must also go through the Polymarket relayer.
export async function approveCTFFromDepositWallet() {
  const operators = [CTF_EXCHANGE_V2, NEG_RISK_EXCHANGE_V2, NEG_RISK_ADAPTER] as const
  const depositWalletAddress = getPlatformDepositWalletAddress()
  const deadline = String(Math.floor(Date.now() / 1000) + 600)

  const calls = operators.map((operator) => ({
    target: CTF_CONTRACT,
    value: '0',
    data: encodeFunctionData({ abi: ERC1155_ABI, functionName: 'setApprovalForAll', args: [operator, true] }),
  }))

  const relayClient = createRelayClient()
  const response = await relayClient.executeDepositWalletBatch(calls, depositWalletAddress, deadline)

  return {
    transactionId: response.transactionID,
    hash: response.transactionHash || null,
    operators,
  }
}

// Transfer any pUSD sitting on the EOA to the deposit wallet.
// One-time migration for funds wrapped before the deposit-wallet switch.
export async function transferPusdFromEoaToDepositWallet() {
  const walletClient = getPlatformWalletClient()
  const publicClient = getPublicClient()
  const account = getPlatformAccount()
  const depositWallet = getPlatformDepositWalletAddress() as `0x${string}`

  const balance = await publicClient.readContract({
    address: PUSD_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address],
  })

  if (balance === 0n) return { transferred: 0, hash: null }

  const data = encodeFunctionData({ abi: ERC20_ABI, functionName: 'transfer', args: [depositWallet, balance] })
  const hash = await walletClient.sendTransaction({ account, to: PUSD_ADDRESS, data, chain: polygon })
  await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })

  return { transferred: Number(balance) / 1e6, hash }
}

// Check on-chain balances for the platform wallet (EOA + deposit wallet).
export async function getPlatformOnChainBalances() {
  const publicClient = getPublicClient()
  const account = getPlatformAccount()
  const depositWallet = getPlatformDepositWalletAddress() as `0x${string}`

  const [maticWei, usdcBalance, usdceBalance, eoaPusdBalance, depositWalletPusdBalance, usdtBalance, usdtAzuroAllowance] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    publicClient.readContract({ address: NATIVE_USDC_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] }),
    publicClient.readContract({ address: USDC_E_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] }),
    publicClient.readContract({ address: PUSD_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] }),
    publicClient.readContract({ address: PUSD_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: [depositWallet] }),
    publicClient.readContract({ address: NATIVE_USDT_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] }),
    publicClient.readContract({ address: NATIVE_USDT_ADDRESS, abi: ERC20_ABI, functionName: 'allowance', args: [account.address, AZURO_LP_ADDRESS] }),
  ])

  return {
    maticBalance: Number(maticWei) / 1e18,
    usdcBalance: Number(usdcBalance) / 1e6,
    usdceBalance: Number(usdceBalance) / 1e6,
    pUsdBalance: Number(eoaPusdBalance) / 1e6,
    depositWalletPusdBalance: Number(depositWalletPusdBalance) / 1e6,
    usdtBalance: Number(usdtBalance) / 1e6,
    usdtAzuroAllowance: Number(usdtAzuroAllowance) / 1e6,
  }
}

// Approve USDT to the Azuro LP contract so the oracle can pull tokens when placing sports bets.
// Run once from the admin panel whenever the platform wallet gets a new USDT balance.
export async function approveUsdtForAzuro() {
  const walletClient = getPlatformWalletClient()
  const publicClient = getPublicClient()
  const account = getPlatformAccount()

  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [AZURO_LP_ADDRESS, maxUint256],
  })

  const hash = await walletClient.sendTransaction({ account, to: NATIVE_USDT_ADDRESS, data, chain: polygon })
  await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })

  return { hash, spender: AZURO_LP_ADDRESS }
}

const NATIVE_USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as `0x${string}`
// Azuro Polygon v3 LP contract — must approve USDT to this address before placing sports bets
const AZURO_LP_ADDRESS = '0x0FA7FB5407eA971694652E6E16C12A52625DE1b8' as `0x${string}`

// Send USDC or USDT from the platform EOA to a user's wallet. Used for withdrawals.
// Waits for 1 confirmation and returns the txHash.
export async function sendTokenToUser(toAddress: string, amountUsd: number, token: 'USDC' | 'USDT' = 'USDC'): Promise<string> {
  const walletClient = getPlatformWalletClient()
  const publicClient = getPublicClient()
  const account = getPlatformAccount()

  const tokenAddress = token === 'USDT' ? NATIVE_USDT_ADDRESS : NATIVE_USDC_ADDRESS
  const amountRaw = BigInt(Math.floor(amountUsd * 1e6))

  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [toAddress as `0x${string}`, amountRaw],
  })

  const txHash = await walletClient.sendTransaction({ account, to: tokenAddress, data, chain: polygon })
  await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })

  return txHash
}

// Approve all three exchange contracts to spend pUSD from the platform EOA wallet.
// Deprecated since April 2026 — use approveExchangesFromDepositWallet() instead.
export async function approveExchangeContracts() {
  const walletClient = getPlatformWalletClient()
  const publicClient = getPublicClient()
  const account = getPlatformAccount()
  const receipts: { spender: string; hash: string; status: string }[] = []

  for (const spender of [CTF_EXCHANGE_V2, NEG_RISK_EXCHANGE_V2, NEG_RISK_ADAPTER]) {
    const data = encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [spender, maxUint256] })
    const hash = await walletClient.sendTransaction({ account, to: PUSD_ADDRESS, data, chain: polygon })
    const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })

    receipts.push({ spender, hash, status: receipt.status })
  }

  return receipts
}

// Wrap native USDC into pUSD via Polymarket's CollateralOnramp contract (1:1 mint).
// Mints pUSD directly to the deposit wallet. amount is in USDC (e.g. 10 = $10).
export async function wrapUsdcToPusd(amountUsdc: number) {
  const walletClient = getPlatformWalletClient()
  const publicClient = getPublicClient()
  const account = getPlatformAccount()
  const depositWallet = getPlatformDepositWalletAddress() as `0x${string}`
  const amountRaw = BigInt(Math.floor(amountUsdc * 1e6))

  // Pre-flight: pick whichever USDC variant is unpaused on the onramp
  const [nativePaused, usdcePaused] = await Promise.all([
    publicClient.readContract({ address: COLLATERAL_ONRAMP, abi: COLLATERAL_ONRAMP_ABI, functionName: 'paused', args: [NATIVE_USDC_ADDRESS] }),
    publicClient.readContract({ address: COLLATERAL_ONRAMP, abi: COLLATERAL_ONRAMP_ABI, functionName: 'paused', args: [USDC_E_ADDRESS] }),
  ])

  const assetAddress = !nativePaused ? NATIVE_USDC_ADDRESS : !usdcePaused ? USDC_E_ADDRESS : null

  if (!assetAddress) {
    throw new Error('Both native USDC and USDC.e are paused on the CollateralOnramp. Check Polymarket status.')
  }

  const assetLabel = assetAddress === NATIVE_USDC_ADDRESS ? 'native USDC' : 'USDC.e'

  // Verify wallet has enough of the chosen asset
  const walletBalance = await publicClient.readContract({ address: assetAddress, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] })

  if (walletBalance < amountRaw) {
    throw new Error(`Insufficient ${assetLabel} balance: have ${Number(walletBalance) / 1e6}, need ${amountUsdc}. Send ${assetLabel} to ${account.address}.`)
  }

  // Step 1: approve CollateralOnramp to pull the chosen asset
  const approveData = encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [COLLATERAL_ONRAMP, amountRaw] })
  const approveTx = await walletClient.sendTransaction({ account, to: assetAddress, data: approveData, chain: polygon })
  await publicClient.waitForTransactionReceipt({ hash: approveTx, confirmations: 1 })

  // Verify the allowance actually landed
  const allowance = await publicClient.readContract({ address: assetAddress, abi: ERC20_ABI, functionName: 'allowance', args: [account.address, COLLATERAL_ONRAMP] })

  if (allowance < amountRaw) {
    throw new Error(`Allowance too low: have ${Number(allowance) / 1e6}, need ${amountUsdc}. Approve tx may have failed.`)
  }

  // Step 2: call CollateralOnramp.wrap → mints pUSD 1:1 directly to the deposit wallet
  const wrapData = encodeFunctionData({
    abi: COLLATERAL_ONRAMP_ABI,
    functionName: 'wrap',
    args: [assetAddress, depositWallet, amountRaw],
  })
  const wrapTx = await walletClient.sendTransaction({ account, to: COLLATERAL_ONRAMP, data: wrapData, chain: polygon })
  const wrapReceipt = await publicClient.waitForTransactionReceipt({ hash: wrapTx, confirmations: 1 })

  return { assetUsed: assetLabel, approveTx, wrapTx, wrapStatus: wrapReceipt.status }
}

// Get the platform wallet's pUSD balance as seen by Polymarket's CLOB API.
export async function getPlatformClobBalance(): Promise<number> {
  const client = createClobClient(true)
  const payload = await client.getBalanceAllowance({ asset_type: 'COLLATERAL' as any })

  return Number((payload as any).balance || 0)
}

// Tell the CLOB to re-read the platform wallet's on-chain pUSD balance and allowances.
// Must be called after wrapping USDC → pUSD; without it the CLOB won't allow trading.
export async function updateClobBalance() {
  const client = createClobClient(true)
  const result = await client.updateBalanceAllowance({ asset_type: 'COLLATERAL' as any })

  return result
}

type PlaceOrderInput = {
  tokenId: string
  side: 'BUY' | 'SELL'
  amount: number
  price: number
  orderType: 'MARKET' | 'LIMIT'
  size?: number
}

type OrderResult = {
  orderId?: string
  status: string
  success: boolean
  errorMsg?: string
}

const NO_MATCH_PATTERN = /no orders found/i

// Place an order on Polymarket using the platform wallet.
export async function placePlatformOrder(input: PlaceOrderInput): Promise<OrderResult> {
  const client = createClobClient(true)

  if (input.orderType === 'MARKET') {
    const worstPrice = input.side === 'BUY'
      ? Math.min(0.999, input.price * 1.10)
      : Math.max(0.001, input.price * 0.90)

    let raw: any
    let noMatchFailed = false

    try {
      raw = await client.createAndPostMarketOrder({
        tokenID: input.tokenId,
        amount: input.amount,
        price: worstPrice,
        side: input.side === 'BUY' ? Side.BUY : Side.SELL,
        orderType: OrderType.FAK,
      }, undefined, OrderType.FAK) as any

      if (raw?.success === false) {
        const msg: string = raw.errorMsg || ''

        if (input.side === 'SELL' && NO_MATCH_PATTERN.test(msg)) {
          noMatchFailed = true
        }
        else {
          return { success: false, status: 'failed', errorMsg: msg || 'Order rejected by Polymarket.' }
        }
      }
    }
    catch (err: any) {
      const msg = String(err)

      if (input.side === 'SELL' && NO_MATCH_PATTERN.test(msg)) {
        noMatchFailed = true
      }
      else {
        throw err
      }
    }

    // No immediate buyers — post a GTC limit sell so it rests on the book
    if (noMatchFailed) {
      const gtcRaw = await client.createAndPostOrder({
        tokenID: input.tokenId,
        price: worstPrice,
        size: input.amount, // amount = shares to sell
        side: Side.SELL,
      }, undefined, OrderType.GTC) as any

      if (gtcRaw?.success === false) {
        return { success: false, status: 'failed', errorMsg: gtcRaw.errorMsg || 'Order rejected by Polymarket.' }
      }

      return {
        success: true,
        orderId: gtcRaw?.orderID,
        status: 'delayed', // resting on book; will fill when a buyer appears
      }
    }

    return {
      success: true,
      orderId: raw?.orderID,
      status: raw?.status || 'submitted',
    }
  }
  else {
    const raw = await client.createAndPostOrder({
      tokenID: input.tokenId,
      price: input.price,
      size: input.size ?? (input.amount / input.price),
      side: input.side === 'BUY' ? Side.BUY : Side.SELL,
    }, undefined, OrderType.GTC) as any

    if (raw?.success === false) {
      return { success: false, status: 'failed', errorMsg: raw.errorMsg || 'Order rejected by Polymarket.' }
    }

    return {
      success: true,
      orderId: raw?.orderID,
      status: raw?.status || 'submitted',
    }
  }
}

export async function getPlatformOpenOrders(tokenIds?: string[]) {
  const client = createClobClient(true)
  const result = await client.getOpenOrders(tokenIds ? { asset_id: tokenIds[0] } : undefined) as any

  return result?.data || result || []
}

// Called after any deposit is credited. Wraps available USDC → pUSD (minted to deposit wallet)
// and re-registers the balance with Polymarket's CLOB so the platform wallet can continue trading.
// Fire-and-forget: call with .catch(console.error), never await in a request handler.
export async function autoWrapIfNeeded(): Promise<void> {
  const { usdcBalance, usdceBalance } = await getPlatformOnChainBalances()

  // Wrap native USDC if present
  if (usdcBalance >= 1) {
    const amount = Math.floor(usdcBalance * 100) / 100
    await wrapUsdcToPusd(amount)
    await updateClobBalance()

    return
  }

  // Wrap USDC.e if present and native USDC isn't available
  if (usdceBalance >= 1) {
    const amount = Math.floor(usdceBalance * 100) / 100
    await wrapUsdcToPusd(amount)
    await updateClobBalance()
  }
}
