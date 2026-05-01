import { NextResponse } from 'next/server'


const mask = (value?: string) => {
  if (!value) {
    return '(missing)'
  }

  if (value.length <= 10) {
    return `${value.slice(0, 2)}...${value.slice(-2)}`
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

export async function GET(request: Request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '(unknown)'

  return NextResponse.json({
    host,
    NEXT_PUBLIC_PRIVY_APP_ID: mask(process.env.NEXT_PUBLIC_PRIVY_APP_ID),
    NEXT_PUBLIC_WALLETCONNECT_ID: mask(process.env.NEXT_PUBLIC_WALLETCONNECT_ID),
    NEXT_PUBLIC_AFFILIATE_ADDRESS: mask(process.env.NEXT_PUBLIC_AFFILIATE_ADDRESS),
    NEXT_PUBLIC_BASE_URL: mask(process.env.NEXT_PUBLIC_BASE_URL),
    NEXT_PUBLIC_SPORTS_APP_URL: mask(process.env.NEXT_PUBLIC_SPORTS_APP_URL),
    NEXT_PUBLIC_PREDIKTS_APP_URL: mask(process.env.NEXT_PUBLIC_PREDIKTS_APP_URL),
    NEXT_PUBLIC_COMPANY_NAME: process.env.NEXT_PUBLIC_COMPANY_NAME || '(missing)',
    AZURO_UNSTABLE_DEV_ENABLED: process.env.AZURO_UNSTABLE_DEV_ENABLED || '(missing)',
  })
}
