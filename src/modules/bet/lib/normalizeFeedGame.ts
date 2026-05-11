import { type GameData } from '@azuro-org/toolkit'
import { type AzuroFeedGame } from 'providers/azuro'


export const normalizeAzuroFeedGame = (game: AzuroFeedGame): GameData | null => {
  const gameId = String(game.gameId || game.id || '')

  if (!gameId) {
    return null
  }

  return {
    ...game,
    id: game.id || gameId,
    gameId,
    slug: game.slug || '',
    title: game.title || '',
    startsAt: String(game.startsAt || ''),
    turnover: String(game.turnover || '0'),
    sport: {
      sportId: String(game.sport?.sportId || '0'),
      slug: game.sport?.slug || '',
      name: game.sport?.name || '',
      sporthub: {
        id: game.sport?.sporthub?.id || '',
        slug: game.sport?.sporthub?.slug || 'sports',
      },
    },
    league: {
      id: game.league?.id,
      slug: game.league?.slug || '',
      name: game.league?.name || '',
    },
    country: {
      id: game.country?.id,
      slug: game.country?.slug || '',
      name: game.country?.name || '',
    },
    participants: Array.isArray(game.participants) ? game.participants : [],
  }
}
