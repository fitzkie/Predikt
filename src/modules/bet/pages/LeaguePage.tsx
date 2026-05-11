'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAnalytics } from 'providers/analytics'
import { useBetLiveRefresh, useBetSports } from 'modules/bet/hooks'

import { LeagueSkeleton } from 'modules/bet/components/sports/League'
import EmptyContent from 'modules/bet/components/sports/EmptyContent'
import Navbar from 'modules/bet/components/sports/Navbar'
import FilteredLeagues from 'modules/bet/components/sports/FilteredLeagues'
import UniqueEvents from 'modules/bet/components/sports/UniqueEvents'


const League: React.FC = () => {
  useBetLiveRefresh()

  const analytics = useAnalytics()
  const params = useParams()
  const { sports, isFetching } = useBetSports()

  useEffect(() => {
    analytics.trackEvent('predikt_bet_browse_league_viewed', {
      sport_slug: typeof params.sportSlug === 'string' ? params.sportSlug : undefined,
      country_slug: typeof params.countrySlug === 'string' ? params.countrySlug : undefined,
      league_slug: typeof params.leagueSlug === 'string' ? params.leagueSlug : undefined,
    })
  }, [ analytics, params.countrySlug, params.leagueSlug, params.sportSlug ])

  if (isFetching) {
    return <LeagueSkeleton isPage />
  }

  if (!sports) {
    return <EmptyContent />
  }

  const sport = sports[0]
  const { slug, leagues } = sport

  return (
    <>
      {
        sport.slug === 'unique' ? (
          <UniqueEvents leagues={leagues} />
        ) : (
          <FilteredLeagues sportSlug={slug} leagues={leagues} isPage />
        )
      }
    </>
  )
}

export default function LeaguePage() {
  return (
    <Navbar>
      <League />
    </Navbar>
  )
}
