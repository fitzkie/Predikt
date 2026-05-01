import cx from 'classnames'

import { Href } from 'components/navigation'


type LogoProps = {
  className?: string
}

const Logo: React.FC<LogoProps> = (props) => {
  const { className } = props

  return (
    <Href to="/" className={cx('inline-flex items-center text-grey-90', className)}>
      <img
        className="block h-auto w-auto max-h-full object-contain"
        src="/branding/predikt-wordmark.png"
        alt="Predikt"
        style={{ height: '28px' }}
      />
    </Href>
  )
}

export default Logo
