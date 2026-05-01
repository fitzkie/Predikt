'use client'

import { usePathname } from 'next/navigation'
import cx from 'classnames'
import { constants } from 'helpers'

import { Href } from 'components/navigation'


const items = [
  {
    label: 'Sports',
    href: constants.links.sportsApp,
    matchers: [ '/bet', '/football', '/basketball', '/tennis', '/cricket', '/mma', '/boxing', '/american-football', '/baseball', '/rugby-union', '/rugby-league', '/ice-hockey', '/unique' ],
  },
  {
    label: 'Predikts',
    href: constants.links.prediktsApp,
    matchers: [ '/predikts' ],
  },
]

type AppModeTabsProps = {
  className?: string
}

const AppModeTabs: React.FC<AppModeTabsProps> = ({ className }) => {
  const pathname = usePathname()

  return (
    <div className={cx('rounded-lg border border-white/10 bg-bg-l2 p-1', className)}>
      <div className="grid grid-cols-2 gap-1">
        {
          items.map((item) => {
            const isActive = item.matchers.some((matcher) => pathname === matcher || pathname.startsWith(`${matcher}/`))

            return (
              <Href
                key={item.label}
                href={item.href}
                className={cx(
                  'rounded-md px-4 py-3 text-center text-caption-13 font-semibold uppercase tracking-[0.18em] transition',
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
