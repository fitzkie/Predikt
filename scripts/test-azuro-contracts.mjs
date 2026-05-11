import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'


const API_BASE_URL = process.env.AZURO_CONTRACT_API_URL || 'https://api.onchainfeed.org/api/v1/public'
const ENVIRONMENT = process.env.AZURO_CONTRACT_ENVIRONMENT || 'PolygonUSDT'
const SNAPSHOT_DIR = path.resolve(process.cwd(), 'tests/contracts/azuro/snapshots')

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

const postJson = async (url, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`POST ${url} failed with ${response.status}`)
  }

  return response.json()
}

const writeSnapshot = async (name, value) => {
  await mkdir(SNAPSHOT_DIR, { recursive: true })
  const filePath = path.join(SNAPSHOT_DIR, `${name}.json`)

  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

const assertGameShape = (game) => {
  assert(game && typeof game === 'object', 'Game payload must be an object')
  assert(typeof game.gameId === 'string' && game.gameId.length > 0, 'Game must include gameId')
  assert(typeof game.title === 'string', 'Game must include title')
  assert(typeof game.startsAt === 'string', 'Game must include startsAt')
  assert(game.sport && typeof game.sport.slug === 'string', 'Game must include sport.slug')
  assert(game.league && typeof game.league.slug === 'string', 'Game must include league.slug')
  assert(game.country && typeof game.country.slug === 'string', 'Game must include country.slug')
  assert(Array.isArray(game.participants) && game.participants.length >= 2, 'Game must include participants')
}

const assertSportShape = (sport) => {
  assert(sport && typeof sport === 'object', 'Sport payload must be an object')
  assert(typeof sport.slug === 'string' && sport.slug.length > 0, 'Sport must include slug')
  assert(Array.isArray(sport.countries), 'Sport must include countries')
}

const assertConditionShape = (condition) => {
  assert(condition && typeof condition === 'object', 'Condition payload must be an object')
  assert(typeof condition.conditionId === 'string' && condition.conditionId.length > 0, 'Condition must include conditionId')
  assert(Array.isArray(condition.outcomes) && condition.outcomes.length >= 2, 'Condition must include outcomes')
  assert(condition.game && typeof condition.game.gameId === 'string', 'Condition must include game.gameId')
}

const assertConditionBatchShape = (condition) => {
  assert(condition && typeof condition === 'object', 'Condition batch payload must be an object')
  assert(typeof condition.conditionId === 'string' && condition.conditionId.length > 0, 'Condition batch must include conditionId')
  assert(Array.isArray(condition.outcomes), 'Condition batch must include outcomes')
}

const getModePayloads = async (gameState) => {
  const topGames = await getJson(`${API_BASE_URL}/market-manager/games-by-filters?environment=${ENVIRONMENT}&gameState=${gameState}&orderBy=turnover&orderDirection=desc&page=1&perPage=10`)

  assert(Array.isArray(topGames.games), `${gameState} top games response must include games array`)

  if (!topGames.games.length) {
    return {
      topGames,
      sports: { sports: [] },
      gamesByIds: { games: [] },
      conditionsByGameIds: { conditions: [] },
      conditionBatch: { conditions: [] },
      sampledGameId: null,
      sampledConditionId: null,
    }
  }

  const [ topGame ] = topGames.games
  assertGameShape(topGame)

  const sports = await getJson(`${API_BASE_URL}/market-manager/sports?environment=${ENVIRONMENT}&gameState=${gameState}&sportSlug=${topGame.sport.slug}&numberOfGames=10&orderBy=turnover&orderDirection=desc`)
  assert(Array.isArray(sports.sports) && sports.sports.length > 0, `${gameState} sports response must include sports`)
  assertSportShape(sports.sports[0])

  const gamesByIds = await postJson(`${API_BASE_URL}/market-manager/games-by-ids`, {
    gameIds: [ topGame.gameId ],
  })
  assert(Array.isArray(gamesByIds.games) && gamesByIds.games.length === 1, `${gameState} games-by-ids must return exactly one game`)
  assertGameShape(gamesByIds.games[0])

  const conditionsByGameIds = await postJson(`${API_BASE_URL}/market-manager/conditions-by-game-ids`, {
    gameIds: [ topGame.gameId ],
    environment: ENVIRONMENT,
  })
  assert(Array.isArray(conditionsByGameIds.conditions) && conditionsByGameIds.conditions.length > 0, `${gameState} conditions-by-game-ids must return conditions`)
  assertConditionShape(conditionsByGameIds.conditions[0])

  const [ topCondition ] = conditionsByGameIds.conditions

  const conditionBatch = await postJson(`${API_BASE_URL}/market-manager/condition-batch`, {
    conditionIds: [ topCondition.conditionId ],
  })
  assert(Array.isArray(conditionBatch.conditions) && conditionBatch.conditions.length === 1, `${gameState} condition-batch must return exactly one condition`)
  assertConditionBatchShape(conditionBatch.conditions[0])

  return {
    topGames,
    sports,
    gamesByIds,
    conditionsByGameIds,
    conditionBatch,
    sampledGameId: topGame.gameId,
    sampledConditionId: topCondition.conditionId,
  }
}

const main = async () => {
  const prematch = await getModePayloads('Prematch')
  const live = await getModePayloads('Live')

  const meta = {
    generatedAt: new Date().toISOString(),
    environment: ENVIRONMENT,
    apiBaseUrl: API_BASE_URL,
    prematch: {
      sampledGameId: prematch.sampledGameId,
      sampledConditionId: prematch.sampledConditionId,
    },
    live: {
      sampledGameId: live.sampledGameId,
      sampledConditionId: live.sampledConditionId,
    },
  }

  await Promise.all([
    writeSnapshot('meta', meta),
    writeSnapshot('prematch-games-by-filters', prematch.topGames),
    writeSnapshot('prematch-sports', prematch.sports),
    writeSnapshot('prematch-games-by-ids', prematch.gamesByIds),
    writeSnapshot('prematch-conditions-by-game-ids', prematch.conditionsByGameIds),
    writeSnapshot('prematch-condition-batch', prematch.conditionBatch),
    writeSnapshot('live-games-by-filters', live.topGames),
    writeSnapshot('live-sports', live.sports),
    writeSnapshot('live-games-by-ids', live.gamesByIds),
    writeSnapshot('live-conditions-by-game-ids', live.conditionsByGameIds),
    writeSnapshot('live-condition-batch', live.conditionBatch),
  ])

  console.log(`Azuro contract snapshots updated in ${SNAPSHOT_DIR}`)
  console.log(JSON.stringify(meta, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
