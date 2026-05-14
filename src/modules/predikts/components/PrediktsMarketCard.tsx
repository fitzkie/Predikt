'use client'

import { useRouter } from 'next/navigation'

import { type PrediktBoardEvent } from '../hooks/usePrediktsMarketBrowser'


type Props = {
  event: PrediktBoardEvent
}

const formatPercent = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--'
  }

  return `${Math.round(value * 100)}%`
}

const formatVolume = (value?: number) => {
  const numericValue = Number(value || 0)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return '$0 Vol.'
  }

  if (numericValue >= 1_000_000) {
    return `$${Math.round(numericValue / 100_000) / 10}m Vol.`
  }

  if (numericValue >= 1_000) {
    return `$${Math.round(numericValue / 100) / 10}k Vol.`
  }

  return `$${Math.round(numericValue)} Vol.`
}

const formatCents = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--'
  }

  return `${Math.round(value * 1000) / 10}¢`
}

const PrediktsMarketCard: React.FC<Props> = ({ event }) => {
  const router = useRouter()
  const displayRows = event.rows.slice(0, 2)
  const hasMoreRows = event.rows.length > displayRows.length

  const openDetail = () => {
    router.push(`/predikts/${event.slug}`)
  }

  const openTrade = (marketSlug: string, outcomeIndex: number) => {
    router.push(`/predikts/${event.slug}?market=${encodeURIComponent(marketSlug)}&outcome=${outcomeIndex}#trade`)
  }

  return (
    <div
      className="cursor-pointer rounded-[1.5rem] border border-white/10 bg-[#161616] p-5 transition hover:border-white/20 hover:bg-[#1b1b1b]"
      onClick={openDetail}
      role="button"
      tabIndex={0}
      onKeyDown={(eventKey) => {
        if (eventKey.key === 'Enter' || eventKey.key === ' ') {
          eventKey.preventDefault()
          openDetail()
        }
      }}
    >
      <div className="flex items-start gap-3">
        {
          event.image ? (
            <img alt="" className="mt-0.5 size-12 rounded-xl object-cover" src={event.image} />
          ) : (
            <div className="mt-0.5 flex size-12 items-center justify-center rounded-xl bg-brand-50/15 text-caption-13 font-semibold uppercase tracking-[0.14em] text-brand-50">
              {(event.category || 'P').slice(0, 2)}
            </div>
          )
        }
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[2rem] font-semibold leading-[1.15] tracking-[-0.04em] text-grey-90">
            {event.title}
          </div>
          <div className="mt-2 text-caption-12 text-grey-60">
            {event.subtitle}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {
          displayRows.map((row) => (
            <div key={row.market.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3">
              <div className="min-w-0">
                <div className="truncate text-[1.15rem] text-grey-80">{row.outcomeLabel}</div>
              </div>
              <div className="text-[1.25rem] font-semibold text-grey-90">{formatPercent(row.probability)}</div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full px-4 py-2 text-[1.05rem] font-semibold transition"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation()
                    openTrade(row.market.slug, 0)
                  }}
                  style={{ backgroundColor: '#234f31', color: '#7ef0a5' }}
                  type="button"
                >
                  Yes
                </button>
                <button
                  className="rounded-full px-4 py-2 text-[1.05rem] font-semibold transition"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation()
                    openTrade(row.market.slug, 1)
                  }}
                  style={{ backgroundColor: '#4c2229', color: '#ff6f7c' }}
                  type="button"
                >
                  No
                </button>
              </div>
            </div>
          ))
        }

        {
          hasMoreRows ? (
            <div className="text-caption-13 text-grey-60">
              +{event.rows.length - displayRows.length} more outcomes
            </div>
          ) : null
        }
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4 text-caption-13 text-grey-60">
        <span>{formatVolume(event.volume)}</span>
        <span>{event.totalMarkets} contracts</span>
      </div>
    </div>
  )
}

export default PrediktsMarketCard
