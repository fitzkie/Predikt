'use client'

import { BetType } from '@azuro-org/sdk'
import { Message } from '@locmod/intl'
import React, { useEffect } from 'react'
import dayjs from 'dayjs'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import cx from 'classnames'
import { useWallet } from 'wallet'

import { Icon } from 'components/ui'
import EmptyContent from 'compositions/EmptyContent/EmptyContent'

import messages from './messages'


type DbSportsBet = {
  id: string
  conditionId: string
  outcomeId: string
  marketName: string | null
  selectionName: string | null
  amount: number
  potentialPayout: number
  odds: number
  status: string
  txHash: string | null
  azuroBetId: string | null
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400',
  won: 'text-accent-green',
  lost: 'text-grey-50',
  refunded: 'text-grey-60',
  failed: 'text-accent-red',
}

const DbBet: React.FC<{ bet: DbSportsBet }> = ({ bet }) => {
  const statusColor = STATUS_COLORS[bet.status] ?? 'text-grey-60'
  const date = dayjs(bet.createdAt).format('DD MMM, HH:mm')

  return (
    <div className="rounded-md bg-bg-l2 px-4 py-3 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-caption-13 text-grey-90 leading-snug">
          {bet.marketName ?? `Condition ${bet.conditionId.slice(0, 16)}…`}
        </span>
        <span className={`flex-none text-caption-12 font-semibold capitalize ${statusColor}`}>{bet.status}</span>
      </div>
      {bet.selectionName && (
        <div className="text-caption-12 text-grey-60">{bet.selectionName}</div>
      )}
      <div className="flex items-center justify-between text-caption-12 text-grey-60 pt-1">
        <span>{date}</span>
        <span>@{bet.odds.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between text-caption-13 pt-0.5">
        <span className="text-grey-60">Stake <span className="text-grey-90 font-semibold">${bet.amount.toFixed(2)}</span></span>
        <span className="text-grey-60">To win <span className={bet.status === 'won' ? 'text-accent-green font-semibold' : 'text-grey-90 font-semibold'}>${bet.potentialPayout.toFixed(2)}</span></span>
      </div>
    </div>
  )
}

const tabs = [
  {
    title: messages.tabs.all,
    value: undefined,
  },
  {
    title: messages.tabs.accepted,
    value: BetType.Accepted,
  },
  {
    title: messages.tabs.settled,
    value: BetType.Settled,
  },
]

type NavbarProps = {
  activeType: BetType | undefined
  onClick: (type: BetType | undefined) => void
}

const Navbar: React.FC<NavbarProps> = ({ activeType, onClick }) => {
  return (
    <div className="flex items-center space-x-2 px-3">
      {
        tabs.map(({ title, value }) => {
          const isActive = activeType === value

          const className = cx('flex items-center p-1 cursor-pointer', {
            'text-grey-60 hover:text-grey-90': !isActive,
            'text-grey-90': isActive,
          })

          return (
            <button key={value || 'all'} className={className} onClick={() => onClick(value)}>
              <Message className="text-caption-13 font-semibold" value={title} />
            </button>
          )
        })
      }
    </div>
  )
}

const STATUS_BY_TAB: Record<string, string[]> = {
  [BetType.Accepted]: [ 'pending' ],
  [BetType.Settled]: [ 'won', 'lost', 'refunded' ],
}

type ContentProps = {
  tab: BetType | undefined
}

const Content: React.FC<ContentProps> = ({ tab }) => {
  const { account: address } = useWallet()
  const [ bets, setBets ] = React.useState<DbSportsBet[]>([])
  const [ loading, setLoading ] = React.useState(false)

  useEffect(() => {
    if (!address) return

    setLoading(true)
    fetch(`/api/sports/bets?address=${address}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.bets)) setBets(d.bets) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ address ])

  const filtered = React.useMemo(() => {
    if (!tab) return bets
    const statuses = STATUS_BY_TAB[tab]
    if (!statuses) return bets
    return bets.filter((b) => statuses.includes(b.status))
  }, [ bets, tab ])

  if (loading) {
    return (
      <div className="py-20">
        <Icon className="size-12 mx-auto" name="interface/spinner" />
      </div>
    )
  }

  if (!filtered.length) {
    return (
      <EmptyContent
        className="py-20"
        image="/images/illustrations/smile_sad.png"
        title={messages.empty.title}
        text={messages.empty.text}
      />
    )
  }

  return (
    <div className="space-y-2">
      {filtered.map((bet) => <DbBet key={bet.id} bet={bet} />)}
    </div>
  )
}

const Bets: React.FC = () => {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const tab = searchParams.get('betType') as BetType || undefined

  const handleTabChange = (type: BetType | undefined) => {
    const params = new URLSearchParams(searchParams.toString())

    if (type) {
      params.set('betType', type)
    }
    else {
      params.delete('betType')
    }

    router.replace(pathname + '?' + params)
  }

  return (
    <div className="space-y-3" id="my-bets">
      <Navbar activeType={tab} onClick={(type) => handleTabChange(type)} />
      <Content tab={tab} />
    </div>
  )
}

export default Bets
