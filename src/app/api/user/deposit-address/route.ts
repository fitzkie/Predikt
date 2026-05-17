import { NextResponse } from 'next/server'
import { db } from 'lib/db'
import { generateDepositWallet, prefundDepositWallet } from 'lib/deposit-wallet'

export const dynamic = 'force-dynamic'


// GET /api/user/deposit-address?address=0x...
// Returns the user's unique custodial deposit address, generating one if this is the first call.
// Funds sent to this address from ANY sender are attributed to this user — solving the
// "exchange withdrawal uses hot wallet as sender" attribution problem.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const walletAddress = searchParams.get('address')?.toLowerCase()

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 })
  }

  try {
    const existing = await db.prediktsUser.findUnique({
      where: { walletAddress },
      select: { id: true, depositAddress: true },
    })

    if (existing?.depositAddress) {
      return NextResponse.json({ depositAddress: existing.depositAddress })
    }

    const { address: depositAddress, encryptedPrivKey } = generateDepositWallet()

    if (existing) {
      await db.prediktsUser.update({
        where: { id: existing.id },
        data: { depositAddress, depositPrivKey: encryptedPrivKey },
      })
    }
    else {
      await db.prediktsUser.create({
        data: { walletAddress, depositAddress, depositPrivKey: encryptedPrivKey },
      })
    }

    // Fire-and-forget: send MATIC so the deposit wallet can pay gas for sweeps
    prefundDepositWallet(depositAddress as `0x${string}`).catch(console.error)

    return NextResponse.json({ depositAddress })
  }
  catch (error) {
    // Unique constraint on depositAddress means two concurrent requests raced — retry once
    try {
      const user = await db.prediktsUser.findUnique({
        where: { walletAddress },
        select: { depositAddress: true },
      })

      if (user?.depositAddress) {
        return NextResponse.json({ depositAddress: user.depositAddress })
      }
    }
    catch {}

    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
