import { NextResponse } from 'next/server'
import { getBetsGraphqlEndpoint } from '@azuro-org/toolkit'


// 137 = Polygon mainnet
const GRAPH_URL = process.env.NEXT_PUBLIC_AZURO_GRAPH_API_URL || getBetsGraphqlEndpoint(137 as any)

// Queries aggregate bet stats for this platform's affiliate address.
// Fetches up to 1000 bets (sufficient for a new platform).
const STATS_QUERY = `
  query PrediktSportsStats($affiliate: String!, $first: Int!, $skip: Int!) {
    v3Bets(
      first: $first
      skip: $skip
      where: { affiliate: $affiliate }
      orderBy: createdAt
      orderDirection: desc
    ) {
      actor
      amount
      payout
      status
    }
  }
`

export async function GET() {
  const affiliateAddress = process.env.NEXT_PUBLIC_AFFILIATE_ADDRESS?.toLowerCase()

  if (!affiliateAddress || !GRAPH_URL) {
    return NextResponse.json({ error: 'Affiliate address or graph URL not configured.' }, { status: 500 })
  }

  try {
    // Fetch up to 1000 bets; new platform won't exceed this soon
    const response = await fetch(GRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        query: STATS_QUERY,
        variables: { affiliate: affiliateAddress, first: 1000, skip: 0 },
      }),
      next: { revalidate: 300 }, // cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`Subgraph request failed: ${response.status}`)
    }

    const payload = await response.json()

    if (payload.errors?.length) {
      throw new Error(payload.errors[0].message)
    }

    const bets: Array<{ actor: string; amount: string; payout: string; status: string }> = payload.data?.v3Bets || []

    const uniqueActors = new Set(bets.map((b) => b.actor.toLowerCase()))
    const totalBetAmount = bets.reduce((sum, b) => sum + Number(b.amount), 0)
    const totalPayouts = bets.reduce((sum, b) => sum + Number(b.payout || 0), 0)

    return NextResponse.json({
      totalBetters: uniqueActors.size,
      totalBets: bets.length,
      totalBetAmount: totalBetAmount / 1e18, // Azuro amounts are in wei (18 decimals for USDT on Polygon)
      totalPayouts: totalPayouts / 1e18,
    })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
