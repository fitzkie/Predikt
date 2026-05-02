import cx from 'classnames'

import { Href } from 'components/navigation'


type LogoProps = {
  className?: string
}

const Logo: React.FC<LogoProps> = (props) => {
  const { className } = props

  return (
    <Href to="/" className={cx('flex items-baseline gap-2 text-grey-90', className)}>
      <span className="text-lg font-semibold tracking-[0.14em] uppercase text-grey-90">
        Predik<span className="text-brand-50">t</span>
      </span>
    </Href>
  )
}

export default Logo
