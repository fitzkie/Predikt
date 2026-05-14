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
  const displayRows = event.rows.slice(0, 1)
  const hasMoreRows = event.rows.length > displayRows.length

  const openDetail = () => {
    router.push(`/predikts/${event.slug}`)
  }

  const openTrade = (marketSlug: string, outcomeIndex: number) => {
    router.push(`/predikts/${event.slug}?market=${encodeURIComponent(marketSlug)}&outcome=${outcomeIndex}#trade`)
  }

  return (
    <div
      className="cursor-pointer rounded-[1.5rem] border border-white/10 bg-[#151515] p-4 transition hover:border-white/20 hover:bg-[#1a1a1a]"
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
          <div className="line-clamp-2 text-[1.6rem] font-semibold leading-[1.2] tracking-[-0.03em] text-grey-90">
            {event.title}
          </div>
          <div className="mt-2 flex items-center gap-2 text-caption-12 text-grey-60">
            <span>{event.subtitle}</span>
            <span className="text-grey-40">•</span>
            <span>{event.totalMarkets} contracts</span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {
          displayRows.map((row) => (
            <div key={row.market.id} className="rounded-[1rem] bg-[#1b1b1c] px-3 py-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1 truncate text-[1.05rem] font-medium text-grey-80">{row.outcomeLabel}</div>
                <div className="shrink-0 text-[1.1rem] font-semibold text-grey-90">{formatPercent(row.probability)}</div>
                <button
                  className="shrink-0 rounded-full px-3 py-2 text-[0.95rem] font-semibold transition hover:brightness-110"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation()
                    openTrade(row.market.slug, 0)
                  }}
                  style={{ backgroundColor: '#234f31', color: '#7ef0a5' }}
                  type="button"
                >
                  Yes {formatCents(row.yesPrice)}
                </button>
                <button
                  className="shrink-0 rounded-full px-3 py-2 text-[0.95rem] font-semibold transition hover:brightness-110"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation()
                    openTrade(row.market.slug, 1)
                  }}
                  style={{ backgroundColor: '#4c2229', color: '#ff6f7c' }}
                  type="button"
                >
                  No {formatCents(row.noPrice)}
                </button>
              </div>
            </div>
          ))
        }

        {
          hasMoreRows ? (
            <div className="px-1 text-caption-13 text-grey-60">
              +{event.rows.length - displayRows.length} more outcomes
            </div>
          ) : null
        }
      </div>

      <div className="mt-4 flex items-center justify-between rounded-[1rem] border border-white/8 bg-[#121212] px-3 py-3 text-caption-13 text-grey-60">
        <span>{formatVolume(event.volume)}</span>
        <span>Open event</span>
      </div>
    </div>
  )
}

export default PrediktsMarketCard
