'use client'

import { useEffect } from 'react'
import { useAnalytics } from 'providers/analytics'
import { useBetLiveRefresh, useBetSports } from 'modules/bet/hooks'

import Sport, { SportSkeleton } from './sports/Sport'
import { LeagueSkeleton } from './sports/League'
import TopEvents from './sports/TopEvents'
import EmptyContent from './sports/EmptyContent'
import Navbar from './sports/Navbar'
import FilteredLeagues from './sports/FilteredLeagues'
import UniqueEvents from './sports/UniqueEvents'


const Sports: React.FC = () => {
  useBetLiveRefresh()

  const { sports, isFetching } = useBetSports()

  if (isFetching) {
    return (
      <SportSkeleton>
        <LeagueSkeleton />
      </SportSkeleton>
    )
  }

  if (!sports) {
    return <EmptyContent />
  }

  return (
    <>
      {
        sports.map((sport) => (
          <Sport key={sport.slug} sport={sport}>
            {
              sport.slug === 'unique' ? (
                <UniqueEvents leagues={sport.leagues} />
              ) : (
                <FilteredLeagues
                  sportSlug={sport.slug}
                  leagues={sport.leagues}
                />
              )
            }
          </Sport>
        ))
      }
    </>
  )
}

const SportsHub: React.FC = () => {
  const analytics = useAnalytics()

  useEffect(() => {
    analytics.trackEvent('predikt_bet_browse_hub_viewed')
  }, [ analytics ])

  return (
    <>
      <TopEvents />
      <Navbar>
        <Sports />
      </Navbar>
    </>
  )
}

export default SportsHub
