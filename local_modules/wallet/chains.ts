import { polygonAmoy, polygon } from 'viem/chains'


const isDevEnabled = Boolean(JSON.parse(process.env.AZURO_UNSTABLE_DEV_ENABLED || 'false'))

export const appChains = isDevEnabled
  ? [ polygonAmoy ] as const
  : [ polygon ] as const
