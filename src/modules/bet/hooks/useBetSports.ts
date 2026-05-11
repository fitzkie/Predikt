'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useLive, useSports as useSdkSports, type UseSportsProps } from '@azuro-org/sdk'
import { GameOrderBy, OrderDirection, type SportData } from '@azuro-org/toolkit'
import { constants } from 'helpers'
import { useAzuroSportsFeed } from 'providers/azuro'


type GraphSport = SportData
type GraphLeague = SportData['countries'][0]['leagues'][0]

export type Sport = Omit<GraphSport, 'countries'> & {
  leagues: Array<GraphLeague & {
    countrySlug: string
    countryName: string
  }>
}

const formatSports = (sports?: Array<Pick<GraphSport, 'countries'> & Omit<GraphSport, 'countries'>>, isTopPage?: boolean) => {
  if (!sports?.length) {
    return
  }

  return sports.reduce<Sport[]>((newSports, sport) => {
    const { countries, ...rest } = sport

    let gamesCount = 0
    const newSport: Sport = {
      ...rest,
      leagues: [],
    }

    for (let countryIndex = 0; countryIndex < countries.length; countryIndex++) {
      const country = countries[countryIndex]
      const { leagues } = country

      if (isTopPage && gamesCount >= constants.topPageGamePerSportLimit) {
        break
      }

      for (let leagueIndex = 0; leagueIndex < leagues.length; leagueIndex++) {
        const league = leagues[leagueIndex]
        const { games, ...leagueRest } = league

        if (isTopPage && gamesCount >= constants.topPageGamePerSportLimit) {
          break
        }

        let leagueGames

        if (isTopPage) {
          const sliceEnd = constants.topPageGamePerSportLimit - gamesCount

          leagueGames = games.slice(0, sliceEnd)
          gamesCount += leagueGames.length
        }
        else {
          leagueGames = games
        }

        newSport.leagues.push({
          ...leagueRest,
          countrySlug: country.slug,
          countryName: country.name,
          games: leagueGames,
        })
      }
    }

    newSports.push(newSport)

    return newSports
  }, [])
}

const normalizeFeedSport = (sport: GraphSport): (Pick<GraphSport, 'countries'> & Omit<GraphSport, 'countries'>) => {
  return {
    id: Number(sport.id || 0),
    slug: String(sport.slug || ''),
    name: String(sport.name || ''),
    sportId: String(sport.sportId || ''),
    turnover: String(sport.turnover || '0'),
    countries: (sport.countries || []).map((country) => ({
      slug: String(country.slug || ''),
      name: String(country.name || ''),
      turnover: String(country.turnover || '0'),
      leagues: (country.leagues || []).map((league) => ({
        slug: String(league.slug || ''),
        name: String(league.name || ''),
        turnover: String(league.turnover || '0'),
        games: Array.isArray(league.games) ? league.games as never[] : [],
      })),
    })),
  } as Pick<GraphSport, 'countries'> & Omit<GraphSport, 'countries'>
}

const useBetSports = () => {
  const params = useParams()
  const isTopPage = !params.sportSlug || params.sportSlug === '/'
  const { isLive } = useLive()

  const sdkProps: UseSportsProps = isTopPage ? {
    gameOrderBy: GameOrderBy.Turnover,
    filter: {
      maxGamesPerLeague: constants.topPageGamePerSportLimit,
    },
    isLive,
  } : {
    gameOrderBy: GameOrderBy.StartsAt,
    orderDir: OrderDirection.Asc,
    filter: {
      sportSlug: params.sportSlug as string,
      countrySlug: params.countrySlug as string,
      leagueSlug: params.leagueSlug as string,
    },
    isLive,
  }

  const sdkQuery = useSdkSports(sdkProps)
  const feedQuery = useAzuroSportsFeed({
    gameState: isLive ? 'Live' : 'Prematch',
    sportSlug: params.sportSlug as string,
    countrySlug: params.countrySlug as string,
    leagueSlug: params.leagueSlug as string,
    numberOfGames: isTopPage ? constants.topPageGamePerSportLimit : undefined,
    orderBy: isTopPage ? 'turnover' : 'startsAt',
    orderDir: isTopPage ? 'desc' : 'asc',
  })

  const feedSports = useMemo(() => {
    if (!feedQuery.isSuccess) {
      return
    }

    return formatSports(feedQuery.data.map(normalizeFeedSport), isTopPage)
  }, [ feedQuery.data, feedQuery.isSuccess, isTopPage ])

  const sdkSports = useMemo(() => {
    return formatSports(sdkQuery.data, isTopPage)
  }, [ sdkQuery.data, isTopPage ])

  return {
    sports: feedQuery.isSuccess ? feedSports : sdkSports,
    isFetching: (feedQuery.isFetching && !feedQuery.isSuccess) || sdkQuery.isFetching,
    source: feedQuery.isSuccess ? 'backend-api' : 'sdk',
    feedQuery,
    sdkQuery,
  } as const
}

export default useBetSports
