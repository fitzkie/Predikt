import { chiliz, gnosis, polygon, polygonAmoy, spicy, base, baseSepolia, bsc, bscTestnet } from 'viem/chains'
import { type ChainId } from '@azuro-org/toolkit'
import { type IconName } from 'components/ui'


const readEnv = (name: string, fallback = '') => {
  const value = process.env[name]

  if (typeof value !== 'string') {
    return fallback
  }

  const trimmedValue = value.trim()

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith('\'') && trimmedValue.endsWith('\''))
  ) {
    return trimmedValue.slice(1, -1).trim()
  }

  return trimmedValue
}

const toAbsoluteUrl = (value: string, fallback: string) => {
  const candidate = value || fallback

  if (!candidate) {
    return fallback
  }

  if (/^https?:\/\//i.test(candidate)) {
    return candidate
  }

  if (candidate.startsWith('//')) {
    return `https:${candidate}`
  }

  if (candidate.startsWith('/')) {
    return candidate
  }

  return `https://${candidate}`
}

const baseUrl = toAbsoluteUrl(readEnv('NEXT_PUBLIC_BASE_URL', 'https://prediktmarkets.com'), 'https://prediktmarkets.com')
const companyName = readEnv('NEXT_PUBLIC_COMPANY_NAME', 'Predikt Markets')
const privyAppId = readEnv('NEXT_PUBLIC_PRIVY_APP_ID')
const isDevEnabled = process.env.NODE_ENV !== 'production' && Boolean(JSON.parse(readEnv('AZURO_UNSTABLE_DEV_ENABLED', 'false') || 'false'))
const docsUrl = readEnv('NEXT_PUBLIC_DOCS_URL')
const termsUrl = readEnv('NEXT_PUBLIC_TERMS_URL')
const policyUrl = readEnv('NEXT_PUBLIC_POLICY_URL')
const faqUrl = readEnv('NEXT_PUBLIC_FAQ_URL')
const sportsAppUrl = toAbsoluteUrl(readEnv('NEXT_PUBLIC_SPORTS_APP_URL', 'https://bet.prediktmarkets.com'), 'https://bet.prediktmarkets.com')
const prediktsAppUrl = toAbsoluteUrl(readEnv('NEXT_PUBLIC_PREDIKTS_APP_URL', 'https://app.prediktmarkets.com'), 'https://app.prediktmarkets.com')
const affiliateAddress = readEnv('NEXT_PUBLIC_AFFILIATE_ADDRESS')
const walletConnectId = readEnv('NEXT_PUBLIC_WALLETCONNECT_ID')
const freebetsEnabled = readEnv('NEXT_PUBLIC_FREEBETS_ENABLED', 'false') === 'true'
const missingAppEnv = [
  !privyAppId && 'NEXT_PUBLIC_PRIVY_APP_ID',
  !walletConnectId && 'NEXT_PUBLIC_WALLETCONNECT_ID',
  !affiliateAddress && 'NEXT_PUBLIC_AFFILIATE_ADDRESS',
].filter(Boolean) as string[]
const hasValidPrivyAppId = privyAppId.length === 25

const rpcByChains: Record<ChainId, string> = {
  [gnosis.id]: 'https://gnosis-rpc.publicnode.com',
  [polygon.id]: 'https://polygon-bor-rpc.publicnode.com',
  [polygonAmoy.id]: 'https://polygon-amoy-bor-rpc.publicnode.com',
  [chiliz.id]: 'https://chiliz-rpc.publicnode.com',
  [spicy.id]: 'https://chiliz-spicy-rpc.publicnode.com',
  [base.id]: 'https://base-rpc.publicnode.com',
  [baseSepolia.id]: 'https://base-sepolia-rpc.publicnode.com',
  [bsc.id]: 'https://bsc-rpc.publicnode.com',
  [bscTestnet.id]: 'https://bsc-testnet-rpc.publicnode.com',
} as const

const chainIcons: Record<ChainId, IconName> = {
  [gnosis.id]: 'networks/gnosis',
  [polygon.id]: 'networks/polygon',
  [polygonAmoy.id]: 'networks/polygon',
  [chiliz.id]: 'networks/chiliz',
  [spicy.id]: 'networks/chiliz',
  [base.id]: 'networks/base',
  [baseSepolia.id]: 'networks/base',
  [bsc.id]: 'networks/binance',
  [bscTestnet.id]: 'networks/binance',
}

const currencyIcons: Record<ChainId, IconName> = {
  [gnosis.id]: 'currency/wxdai',
  [polygon.id]: 'currency/usdt',
  [polygonAmoy.id]: 'currency/azusd',
  [chiliz.id]: 'currency/wchz',
  [spicy.id]: 'currency/wchz',
  [base.id]: 'currency/weth',
  [baseSepolia.id]: 'currency/weth',
  [bsc.id]: 'currency/usdt',
  [bscTestnet.id]: 'currency/usdt',
}

const sportsOrder = [ 'politics', 'football', 'basketball', 'tennis', 'cricket', 'mma', 'boxing', 'ice-hockey', 'american-football', 'baseball', 'rugby-union', 'rugby-league' ]

const links = {
  docs: docsUrl,
  terms: termsUrl,
  policy: policyUrl,
  faq: faqUrl,
  sportsApp: sportsAppUrl,
  prediktsApp: prediktsAppUrl,
  waves: 'https://azuro.org/app/waves',
}

const defaultSlippageValues = [ '5', '10', '15' ]
const defaultQuickBetsValues = [ '50', '100' ]

const prediktsTaxonomy = [
  {
    title: 'Politics',
    slug: 'politics',
    items: [ 'Elections', 'Policy', 'Geopolitics' ],
  },
  {
    title: 'Finance',
    slug: 'finance',
    items: [ 'Fed', 'Rates', 'Stocks', 'Crypto' ],
  },
  {
    title: 'Sports',
    slug: 'sports',
    items: [ 'NFL', 'UFC', 'Soccer' ],
  },
  {
    title: 'Tech',
    slug: 'tech',
    items: [ 'AI', 'Product launches', 'M&A' ],
  },
  {
    title: 'Culture',
    slug: 'culture',
    items: [ 'Movies', 'Music', 'Celebrity' ],
  },
  {
    title: 'Black Swan',
    slug: 'black-swan',
    items: [ 'Pandemics', 'War', 'Space', 'Weather' ],
  },
] as const

const localStorageKeys = {
  slippage: 'slippage',
  quickBet: 'quickBet',
  gameMarketsView: 'gameMarketsView',
  collapsedMarkets: 'collapsedMarkets',
  oddsView: 'oddsView',
  polymarketApiCredentials: 'polymarketApiCredentials',
}

export default {
  baseUrl,
  defaultChain: isDevEnabled ? polygonAmoy : polygon,
  companyName,
  rpcByChains,
  topPageGamePerSportLimit: 10,
  chainIcons,
  currencyIcons,
  sportsOrder,
  links,
  defaultSlippageValues,
  defaultSlippage: '10',
  defaultQuickBetsValues,
  localStorageKeys,
  privyAppId,
  affiliateAddress,
  walletConnectId,
  freebetsEnabled,
  missingAppEnv,
  hasRequiredAppEnv: missingAppEnv.length === 0,
  hasValidPrivyAppId,
  prediktsTaxonomy,
}
