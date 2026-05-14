'use client'

import '@glidejs/glide/dist/css/glide.core.min.css'
import Glide from '@glidejs/glide'
import React, { useEffect, useRef, useState } from 'react'
import { Message } from '@locmod/intl'
import { useParams } from 'next/navigation'
import { ConditionState, type GameMarkets, type GameData } from '@azuro-org/toolkit'
import cx from 'classnames'
import { getGameDateTime } from 'helpers/getters'
import { useBetActiveMarket, useBetGameMarkets, useBetLiveRefresh, useBetTopGames } from 'modules/bet/hooks'

import { Icon, type IconName } from 'components/ui'
import { OpponentLogo } from 'components/dataDisplay'
import { Href } from 'components/navigation'
import OutcomeButton from 'compositions/OutcomeButton/OutcomeButton'

import messages from './messages'


// Drop banner images into public/images/hero/ and add their paths here.
// Auto-advances every 5 seconds.
const HERO_BANNERS: string[] = [
  '/images/hero/banner-1.png',
  '/images/hero/banner-2.png',
  '/images/hero/banner-3.png',
  '/images/hero/banner-4.png',
  '/images/hero/banner-5.png',
  '/images/hero/banner-6.png',
  '/images/hero/banner-7.png',
  '/images/hero/banner-8.png',
]

const HeroBannerCarousel: React.FC = () => {
  const [ current, setCurrent ] = useState(0)

  useEffect(() => {
    if (HERO_BANNERS.length <= 1) {
      return
    }

    const interval = setInterval(() => {
      setCurrent(prev => (prev + 1) % HERO_BANNERS.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  if (!HERO_BANNERS.length) {
    return null
  }

  return (
    <div className="relative mt-4 w-full rounded-md overflow-hidden" style={{ aspectRatio: '16/5' }}>
      {HERO_BANNERS.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={cx('absolute inset-0 w-full h-full object-cover transition-opacity duration-700', {
            'opacity-100': i === current,
            'opacity-0': i !== current,
          })}
        />
      ))}
      {HERO_BANNERS.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2">
          {HERO_BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cx('size-2 rounded-full transition-all', {
                'bg-white scale-110': i === current,
                'bg-white/40 hover:bg-white/70': i !== current,
              })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cx('bone h-[12.125rem] w-full rounded-md', className)} />
  )
}

type ConditionProps = {
  markets: GameMarkets
  game: GameData
}

const Condition: React.FC<ConditionProps> = ({ markets, game }) => {
  const { data } = useBetActiveMarket({ markets })

  const { marketsByKey, activeMarketKey, states } = data
  if (!activeMarketKey) {
    return null
  }

  const { name, conditions } = marketsByKey[activeMarketKey!]
  const { conditionId, outcomes } = conditions[0]

  return (
    <>
      {
        outcomes.map(outcome => (
          <OutcomeButton
            key={outcome.outcomeId}
            marketName={name}
            outcome={outcome}
            game={game}
            isLocked={states[conditionId] !== ConditionState.Active}
          />
        ))
      }
    </>
  )
}

type CardProps = {
  game: GameData
}

const Card: React.FC<CardProps> = ({ game }) => {
  const {
    sport: {
      slug: sportSlug,
    },
    league: {
      name: leagueName,
      slug: leagueSlug,
    },
    country: {
      name: countryName,
      slug: countrySlug,
    },
    gameId,
    participants,
    startsAt,
    title,
  } = game

  const { date, time } = getGameDateTime(+startsAt * 1000)

  const { data: markets, isFetching, isPlaceholderData } = useBetGameMarkets(game.gameId, true)

  return (
    <div className="bg-card-border-bottom p-px rounded-md overflow-hidden">
      <div className="p-4 bg-grey-10 rounded-md">
        <Href to={`/${sportSlug}/${countrySlug}/${leagueSlug}/${gameId}`} className="flex items-center justify-center text-grey-60 text-caption-13 hover:underline">
          <Icon className="size-4 mr-2 flex-none" name={`sport/${sportSlug}` as IconName} />
          <span className="text-ellipsis whitespace-nowrap overflow-hidden">{countryName}</span>
          <div className="size-[2px] rounded-full bg-grey-20 mx-1" />
          <span className="text-ellipsis whitespace-nowrap overflow-hidden">{leagueName}</span>
        </Href>
        <div className="mt-3 flex items-center justify-between px-7">
          <OpponentLogo image={participants[0].image} size={48} />
          <div className="text-caption-12 text-center">
            <div className="text-grey-60">{date}</div>
            <div className="font-semibold mt-[2px]">{time}</div>
          </div>
          <OpponentLogo image={participants[1].image} size={48} />
        </div>
        <div className="mt-5 text-caption-13 font-semibold text-center text-ellipsis whitespace-nowrap overflow-hidden">{title}</div>
        <div className="mt-3 flex items-center space-x-2">
          {
            isFetching || isPlaceholderData || !markets?.length ? (
              <>
                <div className="bone w-full h-7 rounded-sm" />
                <div className="bone w-full h-7 rounded-sm" />
                <div className="bone w-full h-7 rounded-sm" />
              </>
            ) : (
              <Condition markets={markets!} game={game} />
            )
          }
        </div>
      </div>
    </div>
  )
}

const sliderConfiguration = {
  gap: 8,
  perView: 3,
  startAt: 0,
  focusAt: 0,
  autoplay: 5000,
  bound: true,
  breakpoints: {
    802: {
      perView: 1.1,
    },
  },
}

const Events: React.FC = () => {
  useBetLiveRefresh()

  const { games, isFetching } = useBetTopGames()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!games?.length || isFetching) {
      return
    }

    const slider = new Glide(containerRef.current, sliderConfiguration)

    slider.mount()

    return () => {
      slider?.destroy()
    }
  }, [ games, isFetching ])

  if (isFetching) {
    return (
      <div className="flex items-center justify-between mt-6 space-x-2">
        <CardSkeleton />
        <CardSkeleton className="mb:hidden" />
        <CardSkeleton className="mb:hidden" />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="glide !static group mt-6">
      <div className="glide__track" data-glide-el="track">
        <ul className="glide__slides">
          {
            games?.map((game, index) => (
              <li key={index} className="glide__slide overflow-hidden">
                <Card game={game} />
              </li>
            ))
          }
        </ul>
      </div>
      <div className="absolute top-6 right-6 flex items-center" data-glide-el="controls">
        <button className="w-8 h-6 flex items-center justify-center bg-bg-l0 rounded-tl-full rounded-tr-1 rounded-br-1 rounded-bl-full border border-grey-15 text-grey-60 hover:text-grey-90 transition" data-glide-dir="<">
          <Icon className="size-5" name="interface/chevron_left" />
        </button>
        <button className="w-8 h-6 flex items-center justify-center bg-bg-l0 rounded-tl-1 rounded-tr-full rounded-br-full rounded-bl-1 border border-grey-15 text-grey-60 hover:text-grey-90 transition ml-1" data-glide-dir=">">
          <Icon className="size-5" name="interface/chevron_right" />
        </button>
      </div>
    </div>
  )
}

const TopEvents: React.FC = () => {
  const params = useParams()
  const sport = messages[params.sportSlug as string]

  return (
    <div className="relative pt-6">
      <div className="px-4">
        <div className="text-caption-13 uppercase tracking-[0.2em]">
          <span className="text-grey-90">Predik</span>
          <span className="text-brand-50">t</span>
        </div>
        <HeroBannerCarousel />
      </div>
      <Events />
    </div>
  )
}

export default TopEvents
