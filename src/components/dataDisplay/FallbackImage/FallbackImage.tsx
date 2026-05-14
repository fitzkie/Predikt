import React, { useRef, useEffect, useState } from 'react'
import cx from 'classnames'

import { Icon } from 'components/ui'
import type { IconName } from 'components/ui'


type FallbackImageProps = {
  className?: string
  src?: string | null
  fallback?: string
  iconFallback?: string
  alt?: string
}

const FallbackImage: React.FC<FallbackImageProps> = (props) => {
  const { className, src, fallback, iconFallback, alt } = props
  const [ isFallbackIcon, setFallbackIcon ] = useState(!src)

  const ref = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!src) {
      if (iconFallback) {
        setFallbackIcon(true)
      }

      return
    }

    // src arrived or changed — show the image optimistically, fall back on error
    setFallbackIcon(false)

    const img = new window.Image()

    img.onerror = () => {
      if (ref.current) {
        if (iconFallback) {
          setFallbackIcon(true)
        }
        else if (fallback) {
          ref.current.src = fallback
        }
      }
    }

    img.src = src
  }, [ src ])

  return (
    <>
      {
        isFallbackIcon ? (
          <Icon
            className={cx(className, 'text-gray-60' )}
            name={iconFallback as IconName}
          />
        ) : (
          <img
            ref={ref}
            className={className}
            src={src!}
            alt={alt}
          />
        )
      }
    </>
  )
}

export default FallbackImage
