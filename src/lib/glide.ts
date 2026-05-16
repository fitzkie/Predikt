// SERVER-ONLY — only import this from API routes (uses process.env at module load time).
import { createGlideConfig } from '@paywithglide/glide-js'
import { polygon } from '@paywithglide/glide-js/chains'


export const glideConfig = createGlideConfig({
  projectId: process.env.NEXT_PUBLIC_GLIDE_PROJECT_ID!,
  chains: [polygon],
})

// Native USDC on Polygon — the token Glide will deliver to the platform wallet
export const POLYGON_NATIVE_USDC = 'eip155:137/erc20:0x3c499c542cef5e3811e1192ce70d8cc03d5c3359' as const
