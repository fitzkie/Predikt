// SERVER-ONLY — handles per-user custodial deposit wallet generation and key encryption.
// Each user gets a unique EOA keypair. Their deposit address is shown in the UI.
// Funds sent to that address are attributed to them regardless of the sender (exchange hot wallet, etc.).
// Private keys are AES-256-GCM encrypted at rest using DEPOSIT_WALLET_ENCRYPTION_KEY env var.

import crypto from 'crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

const ALGORITHM = 'aes-256-gcm'

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
