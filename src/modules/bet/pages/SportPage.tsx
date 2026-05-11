'use client'

import { useEffect } from 'react'
import { useAnalytics } from 'providers/analytics'
import { useBetLiveRefresh, useBetSports } from 'modules/bet/hooks'
import { useParams } from 'next/navigation'

import Sport, { SportSkeleton } from 'modules/bet/components/sports/Sport'
import { LeagueSkeleton } from 'modules/bet/components/sports/League'
import EmptyContent from 'modules/bet/components/sports/EmptyContent'
import Navbar from 'modules/bet/components/sports/Navbar'
import FilteredLeagues from 'modules/bet/components/sports/FilteredLeagues'
import { GameSkeleton } from 'modules/bet/components/sports/Game'
import UniqueEvents from 'modules/bet/components/sports/UniqueEvents'


const SportWrapper: React.FC = () => {
  useBetLiveRefresh()

  const analytics = useAnalytics()
  const params = useParams()
  const { sports, isFetching } = useBetSports()

  const isUnique = params.sportSlug === 'unique'

  useEffect(() => {
    if (typeof params.sportSlug === 'string') {
      analytics.trackEvent('predikt_bet_browse_sport_viewed', {
        sport_slug: params.sportSlug,
        is_unique: params.sportSlug === 'unique',
      })
    }
  }, [ analytics, params.sportSlug ])

  if (isFetching) {
    return (
      <>
        <SportSkeleton>
          {
            isUnique ? (
              <GameSkeleton className="first-of-type:rounded-t-md" />
            ) : (
              <LeagueSkeleton />
            )
          }
        </SportSkeleton>
      </>
    )
  }

  if (!sports) {
    return <EmptyContent />
  }

  const sport = sports[0]
  const { slug, leagues } = sport

  return (
    <Sport sport={sport!} isPage>
      {
        isUnique ? (
          <UniqueEvents leagues={leagues} />
        ) : (
          <FilteredLeagues
            sportSlug={slug}
            leagues={leagues}
          />
        )
      }
    </Sport>
  )
}

export default function SportPage() {
  return (
    <Navbar>
      <SportWrapper />
    </Navbar>
  )
}
