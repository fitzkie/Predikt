'use client'

import { constants } from 'helpers'

import { Href } from 'components/navigation'

import AppModeTabs from '../AppModeTabs/AppModeTabs'


const PrediktsSidebar: React.FC = () => {
  return (
    <div className="h-full px-4 py-5">
      <div className="rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5">
        <div className="text-caption-12 font-medium uppercase tracking-[0.2em] text-brand-50">Prediction Mode</div>
        <div className="mt-3 text-heading-h4 font-semibold text-grey-90">Predikts</div>
        <p className="mt-3 text-caption-14 leading-6 text-grey-70">
          Event-driven markets organized by theme, built for fast scanning and cleaner discovery.
        </p>
        <AppModeTabs className="mt-5" />
      </div>

      <div className="mt-6">
        <div className="px-1 text-caption-12 font-medium uppercase tracking-[0.18em] text-grey-60">Market taxonomy</div>
        <div className="mt-3 space-y-3">
          {
            constants.prediktsTaxonomy.map((category) => (
              <Href
                key={category.slug}
                href={`${constants.links.prediktsApp}#${category.slug}`}
                className="block rounded-lg border border-white/10 bg-bg-l2 p-4 transition hover:border-brand-50/40 hover:bg-bg-l3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-caption-13 font-semibold uppercase tracking-[0.14em] text-grey-90">{category.title}</div>
                  <div className="text-caption-12 text-brand-50">{category.items.length}</div>
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
            ))
          }
        </div>
      </div>
    </div>
  )
}

export default PrediktsSidebar
