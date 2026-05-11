import { getApiEndpoint, getBetsGraphqlEndpoint, getSocketEndpoint } from '@azuro-org/toolkit'
import { constants } from 'helpers'

import { type AzuroClientConfig } from './types'


const chainId = constants.defaultChain.id
const backendApiUrl = process.env.NEXT_PUBLIC_AZURO_BACKEND_API_URL || getApiEndpoint(chainId)
const graphApiUrl = process.env.NEXT_PUBLIC_AZURO_GRAPH_API_URL || getBetsGraphqlEndpoint(chainId)
const wsBaseUrl = process.env.NEXT_PUBLIC_AZURO_WS_URL || getSocketEndpoint(chainId)

export const azuroClientConfig: AzuroClientConfig = {
  chainId,
  environment: 'PolygonUSDT',
  backendApiUrl,
  graphApiUrl,
  wsUrl: wsBaseUrl.endsWith('/feed') ? wsBaseUrl : `${wsBaseUrl.replace(/\/$/, '')}/feed`,
}
