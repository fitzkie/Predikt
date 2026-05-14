'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import cx from 'classnames'
import { constants } from 'helpers'
import { PrediktsMarketCard, usePrediktsMarketBrowser } from 'modules/predikts'

import { Button } from 'components/inputs'
import { Logo } from 'components/ui'
import { Href } from 'components/navigation'


const sectionDescriptions: Record<string, string> = {
  all: 'Search across every live market on the board.',
  trending: 'Highest-velocity markets across the full board.',
  new: 'Fresh contracts and newly opened markets.',
  politics: 'Elections, policy, geopolitics, and state power.',
  finance: 'Macro, crypto, rates, stocks, and money flows.',
  sports: 'Live and event-driven sports contracts.',
  tech: 'AI, launches, M&A, and product milestones.',
  culture: 'Movies, music, celebrities, and internet moments.',
  'black-swan': 'War, weather, pandemics, and low-probability shocks.',
}

const volumeLabel = (value?: number) => {
  if (!value || value <= 0) {
    return '$0'
  }

  if (value >= 1_000_000) {
    return `$${Math.round(value / 100_000) / 10}m`
  }

  if (value >= 1_000) {
    return `$${Math.round(value / 100) / 10}k`
  }

  return `$${Math.round(value)}`
}

const skeletonCards = new Array(12).fill(0)

const PrediktsHub: React.FC = () => {
  const browser = usePrediktsMarketBrowser()
  const [ activeSection, setActiveSection ] = useState<string>('trending')
  const [ activeSubcategory, setActiveSubcategory ] = useState<string>('all')
  const [ search, setSearch ] = useState('')
  const tabsRef = useRef<HTMLDivElement>(null)

  const normalizedSearch = search.trim().toLowerCase()
  const activeLane = browser.lanes.find((lane) => lane.slug === activeSection)
  const baseMarkets = useMemo(() => {
    if (activeSubcategory !== 'all' && activeLane) {
      return activeLane.subcategories.find((subcategory) => subcategory.slug === activeSubcategory)?.markets || activeLane.markets
    }

    return browser.marketBySection[activeSection] || browser.allMarkets
  }, [ activeLane, activeSection, activeSubcategory, browser.allMarkets, browser.marketBySection ])

  useEffect(() => {
    setActiveSubcategory('all')
  }, [ activeSection ])

  const filteredMarkets = useMemo(() => {
    const sourceMarkets = normalizedSearch ? browser.allMarkets : baseMarkets

    if (!normalizedSearch) {
      return sourceMarkets
    }

    return sourceMarkets.filter((market) => {
      const haystack = [
        market.question,
        market.slug,
        market.category,
        market.description,
        ...(market.events || []).flatMap((event) => [ event.title, event.category, event.description ]),
      ].join(' ').toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [ baseMarkets, browser.allMarkets, normalizedSearch ])

  const activeSectionMeta = browser.sections.find((section) => section.key === activeSection) || browser.sections[0]
  const activeSubcategoryMeta = activeLane?.subcategories.find((subcategory) => subcategory.slug === activeSubcategory)
  const activeSectionDescription = normalizedSearch
    ? 'Search results across all live Predikt markets.'
    : activeSubcategoryMeta
      ? `${activeSubcategoryMeta.label} markets inside ${activeSectionMeta.label}.`
      : (sectionDescriptions[activeSection] || sectionDescriptions.trending)
  const activeSectionVolume = normalizedSearch
    ? browser.allMarkets.reduce((acc, market) => acc + Number(market.volume24hr || market.volume || 0), 0)
    : activeSubcategoryMeta
      ? activeSubcategoryMeta.markets.reduce((acc, market) => acc + Number(market.volume24hr || market.volume || 0), 0)
      : browser.totals[activeSection]
  const visibleCount = filteredMarkets.length
  const supportingTags = activeSection === 'all'
    ? browser.tags.slice(0, 12)
    : (browser.lanes.find((lane) => lane.slug === activeSection)?.items || browser.tags.slice(0, 12))

  const scrollTabs = (direction: 'left' | 'right') => {
    tabsRef.current?.scrollBy({
      left: direction === 'left' ? -320 : 320,
      behavior: 'smooth',
    })
  }

  return (
    <div className="px-2 py-5 ds:px-4">
      <div className="space-y-5">
        <section className="rounded-[1.4rem] border border-white/10 bg-bg-l2 p-4 ds:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 ds:flex-row ds:items-center">
              <div className="flex items-center justify-between ds:min-w-[15rem]">
                <Logo className="h-5" />
                <Href className="ds:hidden" href={constants.links.sportsApp}>
                  <Button size={32} style="secondary" title="Switch to Sports" />
                </Href>
              </div>

              <label className="block flex-1">
                <input
                  className="w-full rounded-[1rem] border border-white/10 bg-bg-l3 px-4 py-3 text-caption-14 text-grey-90 placeholder:text-grey-40"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search across Predikt"
                  value={search}
                />
              </label>

              <Href className="hidden ds:block" href={constants.links.sportsApp}>
                <Button size={40} title="Switch to Sports" />
              </Href>
            </div>

            <div className="flex flex-col gap-2 ds:flex-row ds:items-end ds:justify-between">
              <div>
                <h1 className="mt-2 text-[1.9rem] font-semibold leading-tight tracking-[-0.04em] text-grey-90 ds:text-[2.5rem]">
                  Browse live event-driven markets
                </h1>
                <p className="mt-2 max-w-3xl text-caption-14 leading-7 text-grey-70">
                  Use the Sports button to move into the sportsbook. Use search and categories here to scan live prediction markets, trending topics, and deeper event contracts from one board.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-bg-l3 px-4 py-3 text-right">
                <div className="text-caption-12 uppercase tracking-[0.16em] text-grey-60">Markets showing</div>
                <div className="mt-1 text-heading-h4 font-semibold text-grey-90">{visibleCount}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-bg-l3/40 p-2">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-caption-12 uppercase tracking-[0.16em] text-grey-60">
                  {normalizedSearch ? 'Searching all markets' : 'Browse categories'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full border border-white/10 bg-bg-l2 px-3 py-1.5 text-caption-12 text-grey-60 transition hover:text-grey-90"
                    onClick={() => scrollTabs('left')}
                    type="button"
                  >
                    ←
                  </button>
                  <button
                    className="rounded-full border border-white/10 bg-bg-l2 px-3 py-1.5 text-caption-12 text-grey-60 transition hover:text-grey-90"
                    onClick={() => scrollTabs('right')}
                    type="button"
                  >
                    →
                  </button>
                </div>
              </div>
              <div ref={tabsRef} className="overflow-x-auto no-scrollbar">
                <div className="flex min-w-max items-stretch gap-2 pb-1">
                {
                  browser.sections.map((section) => {
                    const isActive = section.key === activeSection && !normalizedSearch

                    return (
                      <button
                        key={section.key}
                        className={cx(
                          'rounded-2xl border px-4 py-3 text-left transition min-w-[12rem] snap-start',
                          isActive
                            ? 'border-brand-50 bg-brand-50/12'
                            : 'border-white/10 bg-bg-l3 hover:border-white/20'
                        )}
                        onClick={() => setActiveSection(section.key)}
                        type="button"
                      >
                        <div className={cx('text-caption-13 font-semibold', isActive ? 'text-brand-50' : 'text-grey-90')}>
                          {section.label}
                        </div>
                        <div className="mt-1 text-caption-12 leading-5 text-grey-60">
                          {sectionDescriptions[section.key] || sectionDescriptions.trending}
                        </div>
                      </button>
                    )
                  })
                }
                </div>
              </div>
            </div>

            {
              activeLane?.subcategories.length ? (
                <div className="overflow-auto no-scrollbar">
                  <div className="flex min-w-max items-center gap-2">
                    <button
                      className={cx(
                        'rounded-full border px-3 py-1.5 text-caption-12 font-semibold transition',
                        activeSubcategory === 'all'
                          ? 'border-brand-50 bg-brand-50/15 text-brand-50'
                          : 'border-white/10 bg-bg-l3 text-grey-60 hover:text-grey-90'
                      )}
                      onClick={() => setActiveSubcategory('all')}
                      type="button"
                    >
                      All {activeSectionMeta.label}
                    </button>
                    {
                      activeLane.subcategories.map((subcategory) => (
                        <button
                          key={subcategory.slug}
                          className={cx(
                            'rounded-full border px-3 py-1.5 text-caption-12 font-semibold transition',
                            activeSubcategory === subcategory.slug
                              ? 'border-brand-50 bg-brand-50/15 text-brand-50'
                              : 'border-white/10 bg-bg-l3 text-grey-60 hover:text-grey-90'
                          )}
                          onClick={() => setActiveSubcategory(subcategory.slug)}
                          type="button"
                        >
                          {subcategory.label} <span className="ml-1 text-grey-40">{subcategory.count}</span>
                        </button>
                      ))
                    }
                  </div>
                </div>
              ) : (
                <div className="overflow-auto no-scrollbar">
                  <div className="flex min-w-max items-center gap-2">
                    {
                      supportingTags.map((chip) => (
                        <span key={chip} className="rounded-full border border-white/10 bg-bg-l3 px-3 py-1.5 text-caption-12 text-grey-60">
                          {chip}
                        </span>
                      ))
                    }
                  </div>
                </div>
              )
            }
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-white/10 bg-bg-l2 p-5">
          <div className="flex flex-col gap-3 ds:flex-row ds:items-end ds:justify-between">
            <div>
              <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">
                {normalizedSearch ? 'Search Results' : activeSectionMeta.label}
              </div>
              <h2 className="mt-2 text-[1.65rem] font-semibold leading-tight tracking-[-0.04em] text-grey-90">
                {normalizedSearch ? `Results for “${search}”` : `${activeSectionMeta.label} markets`}
              </h2>
              <p className="mt-2 max-w-3xl text-caption-14 leading-7 text-grey-70">
                {activeSectionDescription}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-bg-l3 px-4 py-3 text-right">
              <div className="text-caption-12 uppercase tracking-[0.16em] text-grey-60">Sampled volume</div>
              <div className="mt-1 text-heading-h4 font-semibold text-grey-90">{volumeLabel(activeSectionVolume)}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 ds:grid-cols-4">
            {
              filteredMarkets.length ? filteredMarkets.map((market) => (
                <PrediktsMarketCard key={market.id} market={market} />
              )) : browser.isLoading ? skeletonCards.map((_, index) => (
                <div key={index} className="rounded-[1.35rem] border border-white/10 bg-bg-l3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="bone size-12 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="bone h-5 w-full rounded-full" />
                      <div className="mt-2 bone h-4 w-20 rounded-full" />
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    <div className="bone h-10 w-full rounded-lg" />
                    <div className="bone h-10 w-full rounded-lg" />
                  </div>
                  <div className="mt-5 bone h-10 w-full rounded-lg" />
                </div>
              )) : (
                <div className="rounded-lg border border-white/10 bg-bg-l3 p-4 text-caption-13 text-grey-60 ds:col-span-4">
                  No live markets match the current search.
                </div>
              )
            }
          </div>
        </section>
      </div>
    </div>
  )
}

export default PrediktsHub
