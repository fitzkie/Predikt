'use client'

import { Chain, ClobClient, SignatureTypeV2 } from '@polymarket/clob-client-v2'
import { type WalletClient } from 'viem'

import { polymarketClientConfig } from 'providers/polymarket/client'
import { type PolymarketApiCredentials } from 'providers/polymarket/client'


type CreateTradingClientArgs = {
  signer: WalletClient
  isAAWallet: boolean
  funderAddress?: string
  credentials?: PolymarketApiCredentials | null
}

const getSignatureType = (isAAWallet: boolean) => {
  return isAAWallet ? SignatureTypeV2.POLY_1271 : SignatureTypeV2.EOA
}

const mapCredentials = (credentials: PolymarketApiCredentials) => ({
  key: credentials.apiKey,
  secret: credentials.secret,
  passphrase: credentials.passphrase,
})

const resolveHost = (host: string): string => {
  if (typeof window !== 'undefined' && host.startsWith('/')) {
    return `${window.location.origin}${host}`
  }

  return host
}

const getClientOptions = ({ signer, isAAWallet, funderAddress, credentials }: CreateTradingClientArgs) => ({
  host: resolveHost(polymarketClientConfig.clobApiUrl),
  chain: Chain.POLYGON,
  signer,
  creds: credentials ? mapCredentials(credentials) : undefined,
  signatureType: getSignatureType(isAAWallet),
  funderAddress: isAAWallet ? funderAddress : undefined,
  useServerTime: true,
  throwOnError: true,
})

export const createPolymarketAuthClient = (args: Omit<CreateTradingClientArgs, 'credentials'>) => {
  return new ClobClient(getClientOptions(args))
}

export const createPolymarketExecutionClient = (args: CreateTradingClientArgs) => {
  if (!args.credentials) {
    throw new Error('Polymarket API credentials are required before creating an execution client.')
  }

  return new ClobClient(getClientOptions(args))
}
