'use client'

import React from 'react'
import { type Sport } from 'modules/bet/hooks'

import League from '../League/League'
import EmptyFilteredContent from '../EmptyFilteredContent/EmptyFilteredContent'

import useFilteredLeagues from './utils/useFilteredLeagues'


type LeaguesProps = {
  sportSlug: string
  leagues: Sport['leagues']
  isPage?: boolean
}

const FilteredLeagues: React.FC<LeaguesProps> = ({ sportSlug, leagues, isPage }) => {
  const filteredLeagues = useFilteredLeagues(leagues)

  if (!filteredLeagues?.length) {
    return (
      <EmptyFilteredContent />
    )
  }

  return (
    <>
      {
        filteredLeagues.map(league => (
          <League
            key={`${league.countrySlug}-${league.slug}`}
            sportSlug={sportSlug}
            league={league}
            isPage={isPage}
          />
        ))
      }
    </>
  )
}

export default FilteredLeagues
