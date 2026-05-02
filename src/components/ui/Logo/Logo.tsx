import cx from 'classnames'

import { Href } from 'components/navigation'


type LogoProps = {
  className?: string
}

const Logo: React.FC<LogoProps> = (props) => {
  const { className } = props

  return (
    <Href to="/" className={cx('flex items-baseline text-grey-90', className)}>
      <span className="text-lg font-semibold uppercase tracking-[0.14em] text-grey-90">
        Predik
      </span>
      <span className="text-lg font-semibold uppercase tracking-[0.14em] text-brand-50">
        t
      </span>
    </Href>
  )
}

export default Logo
