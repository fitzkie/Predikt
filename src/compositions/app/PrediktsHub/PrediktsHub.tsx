'use client'

import { constants } from 'helpers'

import { Button } from 'components/inputs'


const highlightedMarkets = [
  {
    category: 'Politics',
    market: 'Will a new major tariff package pass this quarter?',
    price: '57%',
    tone: 'Mixed signal',
  },
  {
    category: 'Finance',
    market: 'Will the Fed cut rates before the end of the quarter?',
    price: '42%',
    tone: 'Risk-on setup',
  },
  {
    category: 'Tech',
    market: 'Will a frontier AI lab ship a new flagship model this month?',
    price: '68%',
    tone: 'Momentum bid',
  },
] as const

const PrediktsHub: React.FC = () => {
  return (
    <div className="px-2 py-6 ds:px-4">
      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(235,180,55,0.16),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 ds:p-8">
        <div className="max-w-4xl">
          <div className="text-caption-12 font-medium uppercase tracking-[0.2em] text-brand-50">Predikts</div>
          <h1 className="mt-4 max-w-4xl text-[2.4rem] font-semibold leading-[0.95] tracking-[-0.05em] text-grey-90 ds:text-[4.25rem]">
            Premium discovery for event-driven markets
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-grey-70 ds:text-lg">
            Organize markets by signal, not by sportsbook convention. Scan politics, finance, tech, culture, and black swan scenarios from one high-context prediction surface.
          </p>
          <div className="mt-7 flex flex-col gap-3 ds:flex-row">
            <Button href={constants.links.sportsApp} size={40} style="secondary" title="Switch to Sports" />
            <Button href={constants.links.prediktsApp} size={40} title="Stay in Predikts" />
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 ds:grid-cols-3">
        {
          highlightedMarkets.map((item) => (
            <div key={item.market} className="rounded-xl border border-white/10 bg-bg-l2 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">{item.category}</span>
                <span className="text-heading-h4 font-semibold text-grey-90">{item.price}</span>
              </div>
              <div className="mt-4 text-heading-h5 font-semibold text-grey-90">{item.market}</div>
              <div className="mt-3 text-caption-13 text-grey-60">{item.tone}</div>
            </div>
          ))
        }
      </section>

      <section className="mt-10 space-y-5">
        {
          constants.prediktsTaxonomy.map((category) => (
            <div
              id={category.slug}
              key={category.slug}
              className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-6"
            >
              <div className="flex flex-col gap-3 ds:flex-row ds:items-end ds:justify-between">
                <div>
                  <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">{category.title}</div>
                  <h2 className="mt-2 text-heading-h3 font-semibold text-grey-90">{category.title} Markets</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {
                    category.items.map((item) => (
                      <span key={item} className="rounded-full border border-white/10 bg-bg-l3 px-3 py-1.5 text-caption-12 text-grey-60">
                        {item}
                      </span>
                    ))
                  }
                </div>
              </div>
              <div className="mt-5 grid gap-4 ds:grid-cols-3">
                {
                  category.items.map((item) => (
                    <div key={item} className="rounded-lg border border-white/10 bg-bg-l3 p-4">
                      <div className="text-caption-12 uppercase tracking-[0.16em] text-grey-60">{category.title}</div>
                      <div className="mt-2 text-heading-h5 font-semibold text-grey-90">{item}</div>
                      <p className="mt-3 text-caption-13 leading-6 text-grey-70">
                        Curate this lane with high-signal, time-bounded markets that feel more like trading instruments than sportsbook rows.
                      </p>
                    </div>
                  ))
                }
              </div>
            </div>
          ))
        }
      </section>
    </div>
  )
}

export default PrediktsHub
