'use client'

import { constants } from 'helpers'
import { usePrediktsMarketBrowser } from 'modules/predikts'

import { Href } from 'components/navigation'


const PrediktsSidebar: React.FC = () => {
  const browser = usePrediktsMarketBrowser()

  return (
    <div className="h-full px-4 py-5">
      <div className="mt-2">
        <div className="px-1 text-caption-12 font-medium uppercase tracking-[0.18em] text-grey-60">Browse Markets</div>
        <div className="mt-3 space-y-3">
          {
            constants.prediktsTaxonomy.map((category) => {
              const count = browser.eventsBySection[category.slug]?.length ?? 0

              return (
                <Href
                  key={category.slug}
                  href={`/predikts?section=${category.slug}`}
                  className="block rounded-lg border border-white/10 bg-bg-l2 p-4 transition hover:border-brand-50/40 hover:bg-bg-l3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-caption-13 font-semibold uppercase tracking-[0.14em] text-grey-90">{category.title}</div>
                    <div className="text-caption-12 text-brand-50">
                      {browser.isLoading ? '—' : count}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {
                      category.items.map((item) => (
                        <span key={item} className="rounded-full border border-white/10 px-2 py-1 text-caption-12 text-grey-60">
                          {item}
                        </span>
                      ))
                    }
                  </div>
                </Href>
              )
            })
          }
        </div>
      </div>
    </div>
  )
}

export default PrediktsSidebar
