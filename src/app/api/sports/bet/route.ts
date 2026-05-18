import { NextResponse } from 'next/server'
import { db } from 'lib/db'
import { placeCustodialBet } from 'lib/azuro-custodial'

export const dynamic = 'force-dynamic'

type BetRequest = {
  walletAddress: string
  conditionId: string
  outcomeId: string
  amount: number       // USD amount (human-readable)
  currentOdds: number  // e.g. 1.85
  marketName?: string
}

// POST /api/sports/bet
// Places a custodial sports bet on behalf of the user using the platform wallet.
export async function POST(request: Request) {
  try {
    const body: BetRequest = await request.json()
    const { walletAddress, conditionId, outcomeId, amount, currentOdds, marketName } = body

    if (!walletAddress || !conditionId || !outcomeId || !amount || !currentOdds) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, conditionId, outcomeId, amount, currentOdds' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
    }

    const normalizedAddress = walletAddress.toLowerCase()
    // Round to 6dp before any DB write — JS floats can produce e.g. 10.700000000000001
    // which exceeds Decimal(18,6) scale and causes Prisma P2000.
    const roundedAmount = parseFloat(amount.toFixed(6))

    // 1. Check user has sufficient balance
    const user = await db.prediktsUser.findUnique({
      where: { walletAddress: normalizedAddress },
      select: { id: true, usdBalance: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Account not found. Please deposit funds first.' }, { status: 404 })
    }

    const currentBalance = Number(user.usdBalance)

    if (currentBalance < roundedAmount) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: $${currentBalance.toFixed(2)}, Required: $${roundedAmount.toFixed(2)}` },
        { status: 400 }
      )
    }

    // 2. Optimistically deduct balance before placing (prevents double-spend)
    await db.prediktsUser.update({
      where: { id: user.id },
      data: { usdBalance: { decrement: roundedAmount } },
    })

    // 3. Place the bet via Azuro oracle
    const betResult = await placeCustodialBet({
      conditionId,
      outcomeId,
      amountUsd: amount,
      currentOdds,
    })

    if (!betResult.success) {
      // Refund the deducted amount if the bet failed
      await db.prediktsUser.update({
        where: { id: user.id },
        data: { usdBalance: { increment: roundedAmount } },
      })
      return NextResponse.json({ error: betResult.error ?? 'Bet placement failed' }, { status: 502 })
    }

    // 4. Record the bet
    const potentialPayout = parseFloat((roundedAmount * currentOdds).toFixed(6))
    const sportsBet = await db.sportsBet.create({
      data: {
        userId: user.id,
        conditionId,
        outcomeId,
        odds: currentOdds,
        amount: roundedAmount,
        potentialPayout,
        status: 'pending',
        txHash: betResult.txHash ?? null,
        azuroBetId: betResult.azuroBetId ?? null,
        marketName: marketName ?? null,
      },
    })

    const updatedUser = await db.prediktsUser.findUnique({
      where: { id: user.id },
      select: { usdBalance: true },
    })

    return NextResponse.json({
      success: true,
      betId: sportsBet.id,
      azuroBetId: betResult.azuroBetId,
      txHash: betResult.txHash,
      newBalance: Number(updatedUser?.usdBalance ?? 0),
    })
  }
  catch (error) {
    const meta = (error as any)?.meta
    console.error('[sports/bet] error:', String(error), 'meta:', JSON.stringify(meta))
    const msg = meta ? `${String(error)} | field: ${JSON.stringify(meta)}` : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
