// SERVER-ONLY — never import this from client components.
// Contains the platform private key used for all Polymarket trades.

import { createWalletClient, http, encodeFunctionData, maxUint256, createPublicClient } from 'viem'
import { polygon } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { ClobClient, Chain, SignatureTypeV2, OrderType, Side } from '@polymarket/clob-client-v2'


// Contract addresses on Polygon for Polymarket V2
const PUSD_ADDRESS = '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB' as `0x${string}`
const NATIVE_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as `0x${string}`
const CTF_EXCHANGE_V2 = '0xE111180000d2663C0091e4f400237545B87B996B' as `0x${string}`
const NEG_RISK_EXCHANGE_V2 = '0xe2222d279d744050d28e00520010520000310F59' as `0x${string}`
const NEG_RISK_ADAPTER = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296' as `0x${string}`

// The Amsterdam proxy bypasses Polymarket's geo-block on Railway's US IP.
const CLOB_HOST = 'http://188.166.103.169:3001'

// polygon-rpc.com now requires an API key — use Ankr's free public endpoint as fallback.
// Set POLYGON_RPC_URL in Railway env vars to use a dedicated Alchemy/Infura/QuickNode endpoint.
const POLYGON_RPC = process.env.POLYGON_RPC_URL || 'https://rpc.ankr.com/polygon'

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
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

// pUSD has a deposit() function: approve USDC for pUSD contract, then call deposit(amount)
const PUSD_ABI = [
  ...ERC20_ABI,
  {
    name: 'deposit',
    type: 'function',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
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
    transport: http(POLYGON_RPC),
  })
}

function getPublicClient() {
  return createPublicClient({
    chain: polygon,
    transport: http(POLYGON_RPC),
  })
}

export function getPlatformAddress(): string {
  return getPlatformAccount().address.toLowerCase()
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

function createClobClient(withCredentials = true) {
  const walletClient = getPlatformWalletClient()
  const creds = withCredentials ? getClobCredentials() : undefined

  const builderCode = process.env.NEXT_PUBLIC_POLYMARKET_BUILDER_CODE

  return new ClobClient({
    host: CLOB_HOST,
    chain: Chain.POLYGON,
    signer: walletClient as any,
    signatureType: SignatureTypeV2.EOA,
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

// Check on-chain balances for the platform wallet.
export async function getPlatformOnChainBalances() {
  const publicClient = getPublicClient()
  const address = getPlatformAccount().address

  const [usdcBalance, pUsdBalance] = await Promise.all([
    publicClient.readContract({ address: NATIVE_USDC_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] }),
    publicClient.readContract({ address: PUSD_ADDRESS, abi: PUSD_ABI, functionName: 'balanceOf', args: [address] }),
  ])

  return {
    usdcBalance: Number(usdcBalance) / 1e6,
    pUsdBalance: Number(pUsdBalance) / 1e6,
  }
}

// Approve all three exchange contracts to spend pUSD from the platform wallet.
export async function approveExchangeContracts() {
  const walletClient = getPlatformWalletClient()
  const account = getPlatformAccount()
  const txHashes: string[] = []

  for (const spender of [CTF_EXCHANGE_V2, NEG_RISK_EXCHANGE_V2, NEG_RISK_ADAPTER]) {
    const data = encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [spender, maxUint256] })
    const hash = await walletClient.sendTransaction({ account, to: PUSD_ADDRESS, data, chain: polygon })

    txHashes.push(hash)
  }

  return txHashes
}

// Wrap native USDC into pUSD. Requires prior USDC allowance for pUSD contract.
// amount is in USDC (e.g. 10 = $10).
export async function wrapUsdcToPusd(amountUsdc: number) {
  const walletClient = getPlatformWalletClient()
  const account = getPlatformAccount()
  const amountRaw = BigInt(Math.floor(amountUsdc * 1e6))

  // Step 1: approve pUSD contract to pull USDC
  const approveData = encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [PUSD_ADDRESS, amountRaw] })
  const approveTx = await walletClient.sendTransaction({ account, to: NATIVE_USDC_ADDRESS, data: approveData, chain: polygon })

  // Step 2: deposit USDC → pUSD
  const depositData = encodeFunctionData({ abi: PUSD_ABI, functionName: 'deposit', args: [amountRaw] })
  const depositTx = await walletClient.sendTransaction({ account, to: PUSD_ADDRESS, data: depositData, chain: polygon })

  return { approveTx, depositTx }
}

// Get the platform wallet's pUSD balance as seen by Polymarket's CLOB API.
export async function getPlatformClobBalance(): Promise<number> {
  const client = createClobClient(true)
  const payload = await client.getBalanceAllowance({ asset_type: 'COLLATERAL' as any })

  return Number((payload as any).balance || 0)
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

// Place an order on Polymarket using the platform wallet.
export async function placePlatformOrder(input: PlaceOrderInput): Promise<OrderResult> {
  const client = createClobClient(true)

  if (input.orderType === 'MARKET') {
    const worstPrice = input.side === 'BUY'
      ? Math.min(0.999, input.price * 1.10)
      : Math.max(0.001, input.price * 0.90)

    const raw = await client.createAndPostMarketOrder({
      tokenID: input.tokenId,
      amount: input.amount,
      price: worstPrice,
      side: input.side === 'BUY' ? Side.BUY : Side.SELL,
      orderType: OrderType.FAK,
    }, undefined, OrderType.FAK) as any

    if (raw?.success === false) {
      return { success: false, status: 'failed', errorMsg: raw.errorMsg || 'Order rejected by Polymarket.' }
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
