'use client'

import { useEffect } from 'react'
import { useGameState } from '@azuro-org/sdk'
import { GameState, type GameData } from '@azuro-org/toolkit'
import { useParams } from 'next/navigation'
import { useAnalytics } from 'providers/analytics'
import { liveStatisticsGameIdStore } from 'helpers/stores'
import { useBetGame, useBetLiveRefresh } from 'modules/bet/hooks'

import EventInfo, { EventInfoSkeleton } from 'modules/bet/components/game/EventInfo'
import Markets, { MarketsSkeleton } from 'modules/bet/components/game/Markets'


type ContentProps = {
  game: GameData
}

const Content: React.FC<ContentProps> = ({ game }) => {
  const { data: state } = useGameState({
    gameId: game.gameId,
    initialState: game.state,
  })

  useEffect(() => {
    if (game?.state === GameState.Live) {
      liveStatisticsGameIdStore.setGameId(game.gameId)
    }
  }, [ game ])

  return (
    <>
      <EventInfo game={game} state={state} />
      <Markets gameState={state} game={game} />
    </>
  )
}

export default function GamePage() {
  const analytics = useAnalytics()
  const params = useParams()
  const gameId = params.gameId as string
  useBetLiveRefresh(true, gameId)

  const { data: game, isFetching } = useBetGame(gameId)

  useEffect(() => {
    analytics.trackEvent('predikt_bet_browse_game_viewed', {
      sport_slug: typeof params.sportSlug === 'string' ? params.sportSlug : undefined,
      country_slug: typeof params.countrySlug === 'string' ? params.countrySlug : undefined,
      league_slug: typeof params.leagueSlug === 'string' ? params.leagueSlug : undefined,
      game_id: gameId,
    })
  }, [ analytics, gameId, params.countrySlug, params.leagueSlug, params.sportSlug ])

  if (isFetching) {
    return (
      <>
        <EventInfoSkeleton />
        <MarketsSkeleton />
      </>
    )
  }

  if (!game) {
    return <div>Game info not found</div>
  }

  return <Content game={game} />
}
