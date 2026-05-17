'use client'

import { usePathname } from 'next/navigation'
import cx from 'classnames'
import { constants } from 'helpers'
import { useWallet } from 'wallet'

import { Href } from 'components/navigation'


const allItems = [
  {
    label: 'Sports',
    href: constants.links.sportsApp,
    matchers: [ '/bet', '/football', '/basketball', '/tennis', '/cricket', '/mma', '/boxing', '/american-football', '/baseball', '/rugby-union', '/rugby-league', '/ice-hockey', '/unique' ],
    requiresAuth: false,
  },
  {
    label: 'Predikt',
    href: constants.links.prediktsApp,
    matchers: [ '/predikts' ],
    requiresAuth: false,
  },
  {
    label: 'Profile',
    href: '/profile',
    matchers: [ '/profile' ],
    requiresAuth: true,
  },
]

type AppModeTabsProps = {
  className?: string
}

const AppModeTabs: React.FC<AppModeTabsProps> = ({ className }) => {
  const pathname = usePathname()
  const { account } = useWallet()

  const items = allItems.filter((item) => !item.requiresAuth || Boolean(account))
  const cols = items.length === 3 ? 'grid-cols-3' : 'grid-cols-2'

  return (
    <div className={cx('rounded-lg border border-white/10 bg-bg-l2 p-1', className)}>
      <div className={cx('grid gap-1', cols)}>
        {
          items.map((item) => {
            const isActive = item.matchers.some((matcher) => pathname === matcher || pathname.startsWith(`${matcher}/`))

            return (
              <Href
                key={item.label}
                href={item.href}
                className={cx(
                  'rounded-md px-2 py-3 text-center text-caption-12 font-semibold uppercase tracking-[0.12em] transition',
                  {
                    'bg-brand-50 text-black shadow-[0_10px_24px_rgba(235,180,55,0.18)]': isActive,
                    'text-grey-60 hover:text-grey-90': !isActive,
                  }
                )}
              >
                {item.label}
              </Href>
            )
          })
        }
      </div>
    </div>
  )
}

export default AppModeTabs
