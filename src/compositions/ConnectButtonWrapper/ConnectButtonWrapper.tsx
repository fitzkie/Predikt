'use client'

import React from 'react'
import { openModal } from '@locmod/modal'
import { useChain } from '@azuro-org/sdk'
import { useWallet } from 'wallet'
import { useOptionalPrivy } from 'providers/auth'

import { Button, buttonMessages, type ButtonProps } from 'components/inputs'


type ConnectButtonWrapperProps = {
  children: React.ReactElement<ButtonProps>
}

const ConnectButtonWrapper: React.FC<ConnectButtonWrapperProps> = ({ children }) => {
  const { appChain } = useChain()
  const { account, chainId, isAAWallet } = useWallet()
  const { ready, login, canLogin } = useOptionalPrivy()
  const { onClick, title, disabled, ...props } = children.props

  const handleConnect = () => {
    if (canLogin) {
      login()
      return
    }

    openModal('ConnectModal')
  }

  if (!account) {
    return (
      <Button
        {...props}
        title={buttonMessages.connectWallet}
        size={props?.size || 40}
        loading={!canLogin && !ready}
        className={props?.className || 'w-full'}
        onClick={handleConnect}
      />
    )
  }

  const isRightNetwork = appChain.id === chainId

  if (!isRightNetwork && !isAAWallet) {
    const handleClick = () => {
      openModal('SwitchNetworkModal', {
        chainId: appChain.id,
      })
    }

    return (
      <Button
        {...props}
        title={buttonMessages.changeNetwork}
        size={props?.size || 40}
        className={props?.className || 'w-full'}
        onClick={handleClick}
      />
    )
  }

  return (
    children
  )
}

export default ConnectButtonWrapper
