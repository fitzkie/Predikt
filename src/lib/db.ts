import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'


declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set.')
  }

  const adapter = new PrismaPg({ connectionString })

  const client = new PrismaClient({ adapter } as any)

  if (process.env.NODE_ENV !== 'production') {
    global.__prisma = client
  }

  return client
}

// Lazy proxy — defers createPrismaClient() to first property access (request time, not build time)
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    if (!global.__prisma) {
      global.__prisma = createPrismaClient()
    }

    return (global.__prisma as any)[prop]
  },
})
