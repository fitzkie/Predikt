import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Redirect to unified deposit check endpoint
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userAddress = searchParams.get('userAddress')
  const base = new URL(request.url)
  const redirectUrl = `${base.origin}/api/predikts/check-deposit?userAddress=${userAddress}`
  const response = await fetch(redirectUrl)
  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}
