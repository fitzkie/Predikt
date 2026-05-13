'use client'

import { useMemo, useState } from 'react'
import { constants } from 'helpers'
import { usePolymarketTags, type PolymarketMarket } from 'providers/polymarket'
import { PrediktsMarketCard, usePrediktsMarketBrowser } from 'modules/predikts'

import { Button } from 'components/inputs'


const featuredTagLabels = (tags: Array<{ label: string }> | undefined) => {
  return (tags || []).slice(0, 8).map((tag) => tag.label)
}

const LaneSection: React.FC<{ title: string, slug: string, items: readonly string[], markets: PolymarketMarket[], count: number, isLoading: boolean }> = ({
  title,
  slug,
  items,
  markets,
  count,
  isLoading,
}) => {
  return (
    <div
      id={slug}
      className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-6"
    >
      <div className="flex flex-col gap-3 ds:flex-row ds:items-end ds:justify-between">
        <div>
          <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">{title}</div>
          <h2 className="mt-2 text-heading-h3 font-semibold text-grey-90">{title} Markets</h2>
          <div className="mt-2 text-caption-13 text-grey-60">{count} live markets found in this lane.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item} className="rounded-full border border-white/10 bg-bg-l3 px-3 py-1.5 text-caption-12 text-grey-60">
              {item}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-4 ds:grid-cols-3">
        {markets.length ? markets.map((market) => (
          <PrediktsMarketCard key={market.id} market={market} compact />
        )) : isLoading ? new Array(6).fill(0).map((_, index) => (
          <div key={index} className="rounded-lg border border-white/10 bg-bg-l3 p-4">
            <div className="bone h-4 w-20 rounded-full" />
            <div className="mt-3 bone h-20 w-full rounded-lg" />
            <div className="mt-4 bone h-10 w-full rounded-lg" />
          </div>
        )) : (
          <div className="rounded-lg border border-white/10 bg-bg-l3 p-4 text-caption-13 text-grey-60 ds:col-span-3">
            No live markets are currently mapped into this lane.
          </div>
        )}
      </div>
    </div>
  )
}

const PrediktsHub: React.FC = () => {
  const tagsQuery = usePolymarketTags()
  const browser = usePrediktsMarketBrowser()
  const [ search, setSearch ] = useState('')
  const normalizedSearch = search.trim().toLowerCase()

  const filteredLiveMarkets = useMemo(() => {
    if (!normalizedSearch) {
      return browser.liveBoardMarkets
    }

    return browser.liveBoardMarkets.filter((market) => {
      const haystack = [
        market.question,
        market.slug,
        market.category,
        market.description,
      ].join(' ').toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [ browser.liveBoardMarkets, normalizedSearch ])

  return (
    <div className="px-2 py-6 ds:px-4">
      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(235,180,55,0.16),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 ds:p-8">
        <div className="max-w-4xl">
          <div className="inline-flex items-center text-caption-12 font-medium uppercase tracking-[0.2em]">
            <span className="text-grey-90">Predik</span>
            <span className="text-brand-50">t</span>
          </div>
          <h1 className="mt-4 max-w-4xl text-[2.4rem] font-semibold leading-[0.95] tracking-[-0.05em] text-grey-90 ds:text-[4.25rem]">
            Browse live event-driven markets
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-grey-70 ds:text-lg">
            Scan politics, finance, sports, tech, culture, and black swan scenarios from one live market surface. Discover active contracts fast, then jump straight into the order book.
          </p>
          <div className="mt-7 flex flex-col gap-3 ds:flex-row">
            <Button href={constants.links.sportsApp} size={40} style="secondary" title="Switch to Sports" />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {featuredTagLabels(tagsQuery.data).map((label) => (
              <span key={label} className="rounded-full border border-white/10 px-3 py-1.5 text-caption-12 text-grey-60">
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-white/10 bg-bg-l2 p-5">
        <div className="flex flex-col gap-4 ds:flex-row ds:items-end ds:justify-between">
          <div>
            <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">Live board</div>
            <h2 className="mt-2 text-heading-h3 font-semibold text-grey-90">Browse active markets</h2>
            <div className="mt-2 text-caption-13 text-grey-60">{browser.totalLiveMarkets} live markets loaded into the current board.</div>
          </div>
          <label className="block ds:min-w-[22rem]">
            <div className="text-caption-12 uppercase tracking-[0.14em] text-grey-60">Search markets</div>
            <input
              className="mt-2 w-full rounded-md border border-white/10 bg-bg-l3 px-3 py-2 text-caption-13 text-grey-90"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search live markets..."
            />
          </label>
        </div>
        <div className="mt-5 grid gap-4 ds:grid-cols-3">
          {filteredLiveMarkets.length ? filteredLiveMarkets.map((item) => (
            <PrediktsMarketCard key={item.id} market={item} />
          )) : browser.isLoading ? (
            new Array(6).fill(0).map((_, index) => (
              <div key={index} className="rounded-xl border border-white/10 bg-bg-l3 p-5">
                <div className="bone h-4 w-20 rounded-full" />
                <div className="mt-4 bone h-14 w-full rounded-lg" />
                <div className="mt-3 bone h-12 w-full rounded-lg" />
                <div className="mt-4 bone h-10 w-full rounded-lg" />
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-white/10 bg-bg-l3 p-4 text-caption-13 text-grey-60 ds:col-span-3">
              No live markets match the current filter.
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-4 ds:grid-cols-3">
        {
          browser.featuredMarkets.length ? browser.featuredMarkets.map((item) => (
            <PrediktsMarketCard key={item.id} market={item} />
          )) : (
            new Array(3).fill(0).map((_, index) => (
              <div key={index} className="rounded-xl border border-white/10 bg-bg-l2 p-5">
                <div className="bone h-4 w-20 rounded-full" />
                <div className="mt-4 bone h-14 w-full rounded-lg" />
                <div className="mt-3 bone h-12 w-full rounded-lg" />
                <div className="mt-4 bone h-10 w-full rounded-lg" />
              </div>
            ))
          )
        }
      </section>

      <section className="mt-10 space-y-5">
        {browser.lanes.map((category) => (
          <LaneSection
            key={category.slug}
            title={category.title}
            slug={category.slug}
            items={category.items}
            markets={category.markets}
            count={category.count}
            isLoading={browser.isLoading}
          />
        ))}
      </section>
    </div>
  )
}

export default PrediktsHub
