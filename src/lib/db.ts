import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'


declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set.')
  }

  const adapter = new PrismaPg({ connectionString })

  return new PrismaClient({ adapter } as any)
}

export const db = global.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = db
}
