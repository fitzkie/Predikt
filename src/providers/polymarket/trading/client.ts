'use client'

import { Chain, ClobClient, SignatureTypeV2, type BuilderConfig } from '@polymarket/clob-client-v2'
import { type WalletClient } from 'viem'

import { polymarketClientConfig } from 'providers/polymarket/client'
import { type PolymarketApiCredentials } from 'providers/polymarket/client'


type CreateTradingClientArgs = {
  signer: WalletClient
  credentials?: PolymarketApiCredentials | null
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

// builderCode is a public bytes32 identifier — safe as NEXT_PUBLIC_*
const getBuilderConfig = (): BuilderConfig | undefined => {
  const code = process.env.NEXT_PUBLIC_POLYMARKET_BUILDER_CODE

  if (!code) {
    return undefined
  }

  return { builderCode: code }
}

const getClientOptions = ({ signer, credentials }: CreateTradingClientArgs) => ({
  host: resolveHost(polymarketClientConfig.clobApiUrl),
  chain: Chain.POLYGON,
  signer,
  creds: credentials ? mapCredentials(credentials) : undefined,
  // Always use plain EOA signing — POLY_1271/POLY_GNOSIS_SAFE require an
  // on-chain contract that may not be deployed for new users.
  signatureType: SignatureTypeV2.EOA,
  useServerTime: true,
  throwOnError: true,
  builderConfig: getBuilderConfig(),
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
