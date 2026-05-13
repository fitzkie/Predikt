'use client'

import React from 'react'
import cx from 'classnames'


type ProfileAvatarProps = {
  className?: string
  displayName?: string
  avatarDataUrl?: string | null
}

const getInitials = (value?: string) => {
  if (!value) {
    return 'P'
  }

  const words = value.trim().split(/\s+/).filter(Boolean)

  if (!words.length) {
    return 'P'
  }

  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() || '').join('') || 'P'
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ className, displayName, avatarDataUrl }) => {
  if (avatarDataUrl) {
    return (
      <div className={cx('overflow-hidden rounded-full border border-white/10 bg-bg-l2', className)}>
        <img
          alt={displayName || 'Predikt user'}
          className="size-full object-cover"
          src={avatarDataUrl}
        />
      </div>
    )
  }

  return (
    <div className={cx('flex items-center justify-center rounded-full border border-white/10 bg-brand-50/15 text-brand-50', className)}>
      <span className="text-caption-13 font-semibold uppercase tracking-[0.16em]">
        {getInitials(displayName)}
      </span>
    </div>
  )
}

export default ProfileAvatar
