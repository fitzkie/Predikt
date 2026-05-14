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

const PrediktsMarketCard: React.FC<Props> = ({ event }) => {
  const router = useRouter()
  const displayRows = event.rows.slice(0, 2)
  const extraCount = event.rows.length - displayRows.length

  const openDetail = () => {
    router.push(`/predikts/${event.slug}`)
  }

  const openTrade = (marketSlug: string, outcomeIndex: number) => {
    router.push(`/predikts/${event.slug}?market=${encodeURIComponent(marketSlug)}&outcome=${outcomeIndex}#trade`)
  }

  return (
    <div
      className="flex cursor-pointer flex-col rounded-[1.5rem] border border-white/10 bg-[#151515] p-4 transition hover:border-white/20 hover:bg-[#1a1a1a]"
      onClick={openDetail}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openDetail()
        }
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {
          event.image ? (
            <img alt="" className="mt-0.5 w-10 h-10 flex-none rounded-xl object-cover overflow-hidden" src={event.image} />
          ) : (
            <div className="mt-0.5 flex w-10 h-10 flex-none items-center justify-center rounded-xl bg-brand-50/15 text-caption-12 font-semibold uppercase tracking-[0.14em] text-brand-50">
              {(event.category || 'P').slice(0, 2)}
            </div>
          )
        }
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[1rem] font-semibold leading-[1.3] tracking-[-0.02em] text-grey-90">
            {event.title}
          </div>
          <div className="mt-1 text-caption-11 text-grey-60">
            {event.subtitle}&nbsp;·&nbsp;{event.totalMarkets} contracts
          </div>
        </div>
      </div>

      {/* Outcome rows */}
      <div className="mt-3 flex-1 space-y-1.5">
        {
          displayRows.map((row) => (
            <div key={row.market.id} className="flex items-center gap-2 rounded-xl bg-[#1b1b1c] px-2.5 py-2">
              <div className="min-w-0 flex-1 truncate text-[0.85rem] text-grey-80">{row.outcomeLabel}</div>
              <div className="w-10 shrink-0 text-right text-[0.85rem] font-semibold text-grey-90">{formatPercent(row.probability)}</div>
              <button
                className="shrink-0 rounded-lg px-2.5 py-1 text-[0.78rem] font-semibold transition hover:brightness-110"
                onClick={(e) => { e.stopPropagation(); openTrade(row.market.slug, 0) }}
                style={{ backgroundColor: '#234f31', color: '#7ef0a5' }}
                type="button"
              >
                Yes
              </button>
              <button
                className="shrink-0 rounded-lg px-2.5 py-1 text-[0.78rem] font-semibold transition hover:brightness-110"
                onClick={(e) => { e.stopPropagation(); openTrade(row.market.slug, 1) }}
                style={{ backgroundColor: '#4c2229', color: '#ff6f7c' }}
                type="button"
              >
                No
              </button>
            </div>
          ))
        }
        {extraCount > 0 && (
          <div className="px-1 text-[0.78rem] text-grey-60">+{extraCount} more outcomes</div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 text-[0.78rem] text-grey-60">
        {formatVolume(event.volume)}
      </div>
    </div>
  )
}

export default PrediktsMarketCard
