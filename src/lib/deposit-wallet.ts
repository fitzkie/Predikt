// SERVER-ONLY — handles per-user custodial deposit wallet generation and key encryption.
// Each user gets a unique EOA keypair. Their deposit address is shown in the UI.
// Funds sent to that address are attributed to them regardless of the sender (exchange hot wallet, etc.).
// Private keys are AES-256-GCM encrypted at rest using DEPOSIT_WALLET_ENCRYPTION_KEY env var.

import crypto from 'crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, createPublicClient, http, parseEther } from 'viem'
import { polygon } from 'viem/chains'
import { getPlatformAddress, getPublicClient } from './platform-wallet'

const ALGORITHM = 'aes-256-gcm'

const USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as `0x${string}`
const NATIVE_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as `0x${string}`

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { name: 'transfer', type: 'function', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
] as const

// 0.005 MATIC (~$0.004) — enough for several ERC-20 transfer txs on Polygon
const MATIC_PREFUND = parseEther('0.005')

function getEncryptionKey(): Buffer {
  const hex = process.env.DEPOSIT_WALLET_ENCRYPTION_KEY

  if (!hex || hex.length !== 64) {
    throw new Error('DEPOSIT_WALLET_ENCRYPTION_KEY must be a 32-byte value expressed as 64 hex characters')
  }

  return Buffer.from(hex, 'hex')
}

export function encryptPrivKey(privKey: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(privKey, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`
}

export function decryptPrivKey(encrypted: string): string {
  const key = getEncryptionKey()
  const parts = encrypted.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted private key format — expected iv:authTag:ciphertext')
  }

  const [ivHex, authTagHex, ciphertextHex] = parts
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))

  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))

  return decipher.update(Buffer.from(ciphertextHex, 'hex'), undefined, 'utf8') + decipher.final('utf8')
}

export function generateDepositWallet(): { address: string; encryptedPrivKey: string } {
  const privKey = generatePrivateKey()
  const account = privateKeyToAccount(privKey)

  return {
    address: account.address.toLowerCase(),
    encryptedPrivKey: encryptPrivKey(privKey),
  }
}

// Send a tiny MATIC stipend to a new deposit wallet so it can pay gas for sweeps.
// Called fire-and-forget when a deposit wallet is first created.
export async function prefundDepositWallet(depositAddress: `0x${string}`): Promise<void> {
  const platformPrivKey = process.env.PLATFORM_WALLET_PRIVATE_KEY
  if (!platformPrivKey) return

  const publicClient = getPublicClient()
  const maticBalance = await publicClient.getBalance({ address: depositAddress })

  // Skip if already funded
  if (maticBalance >= parseEther('0.001')) return

  const account = privateKeyToAccount(platformPrivKey as `0x${string}`)
  const walletClient = createWalletClient({
    account,
    chain: polygon,
    transport: http(process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com'),
  })

  await walletClient.sendTransaction({
    account,
    to: depositAddress,
    value: MATIC_PREFUND,
    chain: polygon,
  })
}

// Move all USDC and USDT from a user's deposit wallet to the platform trading wallet.
// Called fire-and-forget after every deposit is credited.
// Returns total USD swept (0 if nothing to sweep).
export async function sweepDepositWallet(depositAddress: string, encryptedPrivKey: string): Promise<number> {
  const privKey = decryptPrivKey(encryptedPrivKey)
  const account = privateKeyToAccount(privKey as `0x${string}`)
  const platformAddress = getPlatformAddress() as `0x${string}`

  const publicClient = getPublicClient()
  const walletClient = createWalletClient({
    account,
    chain: polygon,
    transport: http(process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com'),
  })

  let totalSwept = 0

  for (const tokenAddress of [USDT_ADDRESS, NATIVE_USDC_ADDRESS]) {
    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [depositAddress as `0x${string}`],
    })

    if (balance > 0n) {
      await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [platformAddress, balance],
        chain: polygon,
      })
      totalSwept += Number(balance) / 1e6
    }
  }

  return totalSwept
}
