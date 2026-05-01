import cx from 'classnames'

import { Href } from 'components/navigation'


type LogoProps = {
  className?: string
}

const Logo: React.FC<LogoProps> = (props) => {
  const { className } = props

  return (
    <Href to="/" className={cx('flex items-baseline gap-2 text-grey-90', className)}>
      <span className="text-lg font-semibold tracking-[0.14em] uppercase text-brand-50">
        Predikt
      </span>
      <span className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-grey-60">
        Markets
      </span>
    </Href>
  )
}

export default Logo
