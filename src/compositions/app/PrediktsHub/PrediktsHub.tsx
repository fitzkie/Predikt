'use client'

import { useMemo, useState } from 'react'
import cx from 'classnames'
import { constants } from 'helpers'
import { PrediktsMarketCard, usePrediktsMarketBrowser } from 'modules/predikts'

import { Button } from 'components/inputs'
import AppModeTabs from '../AppModeTabs/AppModeTabs'


const skeletonCards = new Array(12).fill(0)

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

const PrediktsHub: React.FC = () => {
  const browser = usePrediktsMarketBrowser()
  const [ activeSection, setActiveSection ] = useState<string>('trending')
  const [ search, setSearch ] = useState('')

  const normalizedSearch = search.trim().toLowerCase()
  const boardMarkets = browser.marketBySection[activeSection] || browser.trendingMarkets

  const filteredMarkets = useMemo(() => {
    if (!normalizedSearch) {
      return boardMarkets
    }

    return boardMarkets.filter((market) => {
      const haystack = [
        market.question,
        market.slug,
        market.category,
        market.description,
        ...(market.events || []).flatMap((event) => [ event.title, event.category, event.description ]),
      ].join(' ').toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [ boardMarkets, normalizedSearch ])

  const activeSectionMeta = browser.sections.find((section) => section.key === activeSection) || browser.sections[0]
  const activeLane = browser.lanes.find((lane) => lane.slug === activeSection)
  const featuredChips = activeLane?.items || browser.tags.slice(0, 12)

  return (
    <div className="px-2 py-5 ds:px-4">
      <div className="space-y-5">
        <div className="rounded-xl border border-white/10 bg-bg-l2 p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 ds:flex-row ds:items-center ds:justify-between">
              <div className="ds:max-w-[18rem]">
                <AppModeTabs />
              </div>
              <label className="block flex-1">
                <input
                  className="w-full rounded-xl border border-white/10 bg-bg-l3 px-4 py-3 text-caption-14 text-grey-90 placeholder:text-grey-40"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search across Predikt"
                  value={search}
                />
              </label>
              <div className="flex items-center gap-3 text-caption-13">
                <div className="rounded-lg border border-white/10 bg-bg-l3 px-4 py-3 text-grey-60">
                  <div>Trending</div>
                  <div className="mt-1 font-semibold text-grey-90">{browser.totalLiveMarkets}</div>
                </div>
                <Button href={constants.links.sportsApp} size={40} style="secondary" title="Sports" />
              </div>
            </div>

            <div className="overflow-auto no-scrollbar">
              <div className="flex min-w-max items-center gap-2">
                {
                  browser.sections.map((section) => {
                    const isActive = section.key === activeSection

                    return (
                      <button
                        key={section.key}
                        className={cx(
                          'rounded-full border px-4 py-2 text-caption-13 font-semibold transition',
                          isActive
                            ? 'border-brand-50 bg-brand-50/15 text-brand-50'
                            : 'border-white/10 bg-bg-l3 text-grey-60 hover:text-grey-90'
                        )}
                        onClick={() => setActiveSection(section.key)}
                        type="button"
                      >
                        {section.label}
                      </button>
                    )
                  })
                }
              </div>
            </div>

            <div className="overflow-auto no-scrollbar">
              <div className="flex min-w-max items-center gap-2">
                {
                  featuredChips.map((chip) => (
                    <span key={chip} className="rounded-full border border-white/10 bg-bg-l3 px-3 py-1.5 text-caption-12 text-grey-60">
                      {chip}
                    </span>
                  ))
                }
              </div>
            </div>
          </div>
        </div>

        <section className="rounded-xl border border-white/10 bg-bg-l2 p-5">
          <div className="flex flex-col gap-3 ds:flex-row ds:items-end ds:justify-between">
            <div>
              <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">{activeSectionMeta.label}</div>
              <h1 className="mt-2 text-[2rem] font-semibold leading-tight tracking-[-0.04em] text-grey-90">
                {activeSectionMeta.label === 'Trending' ? 'Trending markets' : `${activeSectionMeta.label} markets`}
              </h1>
              <p className="mt-2 text-caption-14 leading-7 text-grey-70">
                {filteredMarkets.length} live markets on the board. {volumeLabel(browser.totals[activeSection])} in sampled volume across the current section.
              </p>
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
                  No live markets match the current filter.
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
