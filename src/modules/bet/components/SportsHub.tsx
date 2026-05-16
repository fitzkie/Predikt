'use client'

import { useEffect, useState } from 'react'
import { useAnalytics } from 'providers/analytics'
import { useBetLiveRefresh, useBetSports } from 'modules/bet/hooks'

import Sport, { SportSkeleton } from './sports/Sport'
import { LeagueSkeleton } from './sports/League'
import TopEvents from './sports/TopEvents'
import EmptyContent from './sports/EmptyContent'
import Navbar from './sports/Navbar'
import FilteredLeagues from './sports/FilteredLeagues'
import UniqueEvents from './sports/UniqueEvents'


type SportsStats = {
  totalBetters: number
  totalBets: number
  totalBetAmount: number
}

const SportsStatsBar: React.FC = () => {
  const [ stats, setStats ] = useState<SportsStats | null>(null)

  useEffect(() => {
    fetch('/api/bet/stats')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setStats(d) })
      .catch(() => {})
  }, [])

  if (!stats) return null

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

  return (
    <div className="flex items-center gap-6 px-4 py-2 mb-2 bg-bg-l2 rounded-xl text-caption-12 text-grey-60">
      <span><strong className="text-grey-90">{fmt(stats.totalBetters)}</strong> betters</span>
      <span><strong className="text-grey-90">{fmt(stats.totalBets)}</strong> bets</span>
      <span><strong className="text-grey-90">${stats.totalBetAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong> wagered</span>
    </div>
  )
}

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
        <SportsStatsBar />
        <Sports />
      </Navbar>
    </>
  )
}

export default SportsHub
