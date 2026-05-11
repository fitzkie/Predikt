import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'


const GAMMA_API_URL = process.env.POLYMARKET_GAMMA_API_URL || 'https://gamma-api.polymarket.com'
const CLOB_API_URL = process.env.POLYMARKET_CLOB_API_URL || 'https://clob.polymarket.com'
const DATA_API_URL = process.env.POLYMARKET_DATA_API_URL || 'https://data-api.polymarket.com'
const SNAPSHOT_DIR = path.resolve(process.cwd(), 'tests/contracts/polymarket/snapshots')

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const getJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`GET ${url} failed with ${response.status}`)
  }

  return response.json()
}

const writeSnapshot = async (name, value) => {
  await mkdir(SNAPSHOT_DIR, { recursive: true })
  const filePath = path.join(SNAPSHOT_DIR, `${name}.json`)

  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

const parseTokenIds = (market) => {
  try {
    const parsed = JSON.parse(market.clobTokenIds || '[]')

    return Array.isArray(parsed) ? parsed : []
  }
  catch {
    return []
  }
}

const assertMarketShape = (market) => {
  assert(market && typeof market === 'object', 'Market payload must be an object')
  assert(typeof market.id === 'string' && market.id.length > 0, 'Market must include id')
  assert(typeof market.slug === 'string' && market.slug.length > 0, 'Market must include slug')
  assert(typeof market.question === 'string' && market.question.length > 0, 'Market must include question')
}

const assertEventShape = (event) => {
  assert(event && typeof event === 'object', 'Event payload must be an object')
  assert(typeof event.id === 'string' && event.id.length > 0, 'Event must include id')
  assert(typeof event.slug === 'string' && event.slug.length > 0, 'Event must include slug')
  assert(Array.isArray(event.markets), 'Event must include markets array')
}

const assertTagShape = (tag) => {
  assert(tag && typeof tag === 'object', 'Tag payload must be an object')
  assert(typeof tag.id === 'string' && tag.id.length > 0, 'Tag must include id')
  assert(typeof tag.slug === 'string' && tag.slug.length > 0, 'Tag must include slug')
}

const assertOrderBookShape = (book) => {
  assert(book && typeof book === 'object', 'Order book payload must be an object')
  assert(typeof book.asset_id === 'string' && book.asset_id.length > 0, 'Order book must include asset_id')
  assert(Array.isArray(book.bids), 'Order book must include bids')
  assert(Array.isArray(book.asks), 'Order book must include asks')
}

const main = async () => {
  const markets = await getJson(`${GAMMA_API_URL}/markets?active=true&closed=false&limit=5`)
  assert(Array.isArray(markets) && markets.length > 0, 'Markets response must include items')
  assertMarketShape(markets[0])

  const events = await getJson(`${GAMMA_API_URL}/events?closed=false&limit=3`)
  assert(Array.isArray(events) && events.length > 0, 'Events response must include items')
  assertEventShape(events[0])

  const tags = await getJson(`${GAMMA_API_URL}/tags`)
  assert(Array.isArray(tags) && tags.length > 0, 'Tags response must include items')
  assertTagShape(tags[0])

  const search = await getJson(`${GAMMA_API_URL}/public-search?q=AI`)
  assert(search && typeof search === 'object', 'Search response must be an object')
  assert(Array.isArray(search.events) || Array.isArray(search.markets), 'Search response must include events or markets')

  const marketSlug = markets[0].slug
  const marketBySlug = await getJson(`${GAMMA_API_URL}/markets/slug/${marketSlug}`)
  assertMarketShape(marketBySlug)

  const tokenIds = parseTokenIds(marketBySlug)
  assert(tokenIds.length > 0, 'Market must include at least one CLOB token id')

  const orderBook = await getJson(`${CLOB_API_URL}/book?token_id=${tokenIds[0]}`)
  assertOrderBookShape(orderBook)

  const emptyPositions = await getJson(`${DATA_API_URL}/positions?user=0x0000000000000000000000000000000000000000`)
  assert(Array.isArray(emptyPositions), 'Positions response must be an array')

  const emptyActivity = await getJson(`${DATA_API_URL}/activity?user=0x0000000000000000000000000000000000000000&sortBy=TIMESTAMP&sortDirection=DESC`)
  assert(Array.isArray(emptyActivity), 'Activity response must be an array')

  const meta = {
    generatedAt: new Date().toISOString(),
    gammaApiUrl: GAMMA_API_URL,
    clobApiUrl: CLOB_API_URL,
    dataApiUrl: DATA_API_URL,
    sampledMarketSlug: marketSlug,
    sampledTokenId: tokenIds[0],
    sampledEventId: events[0].id,
  }

  await Promise.all([
    writeSnapshot('meta', meta),
    writeSnapshot('markets', markets),
    writeSnapshot('events', events),
    writeSnapshot('tags', tags),
    writeSnapshot('search-ai', search),
    writeSnapshot('market-by-slug', marketBySlug),
    writeSnapshot('order-book', orderBook),
    writeSnapshot('positions-empty-wallet', emptyPositions),
    writeSnapshot('activity-empty-wallet', emptyActivity),
  ])

  console.log(`Polymarket contract snapshots updated in ${SNAPSHOT_DIR}`)
  console.log(JSON.stringify(meta, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
