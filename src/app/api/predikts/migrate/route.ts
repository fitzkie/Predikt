import { NextResponse } from 'next/server'
import { db } from 'lib/db'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS predikts_users (
        id            TEXT PRIMARY KEY,
        "walletAddress" TEXT UNIQUE NOT NULL,
        "pUsdBalance" DECIMAL(18,6) NOT NULL DEFAULT 0,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `

    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS predikts_deposits (
        id           TEXT PRIMARY KEY,
        "userId"     TEXT NOT NULL REFERENCES predikts_users(id),
        "txHash"     TEXT UNIQUE NOT NULL,
        "amountUsdc" DECIMAL(18,6) NOT NULL,
        status       TEXT NOT NULL DEFAULT 'confirmed',
        "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `

    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS predikts_orders (
        id               TEXT PRIMARY KEY,
        "userId"         TEXT NOT NULL REFERENCES predikts_users(id),
        "polyOrderId"    TEXT,
        "tokenId"        TEXT NOT NULL,
        "marketQuestion" TEXT,
        side             TEXT NOT NULL,
        amount           DECIMAL(18,6) NOT NULL,
        price            DOUBLE PRECISION NOT NULL,
        "orderType"      TEXT NOT NULL DEFAULT 'MARKET',
        status           TEXT NOT NULL DEFAULT 'pending',
        "errorMessage"   TEXT,
        "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `

    return NextResponse.json({ success: true, message: 'Tables created (or already exist).' })
  }
  catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
