'use client'

import { type ReactNode, useEffect } from 'react'
import { type ModalComponent } from '@locmod/modal'
import { type Connector, useConnect } from 'wagmi'
import { Message } from '@locmod/intl'
import { useDevice } from 'contexts'
import { useWallet } from 'wallet'
import { useOptionalPrivy } from 'providers/auth'

import { PlainModal } from 'components/feedback'
import { Button } from 'components/inputs'

import { ActionScreen, Buttons } from './components'
import messages from './messages'


type ConnectModalProps = {
  withSuccessModal?: boolean
  onFinish?: () => void
}

const ConnectModal: ModalComponent<ConnectModalProps> = (props) => {
  const { closeModal, onFinish } = props

  const { isConnected, connector } = useWallet()
  const { connectAsync, connectors, isPending, isError, error, variables, reset } = useConnect()
  const { isMobileDevice } = useDevice()
  const { login, canLogin, ready } = useOptionalPrivy()

  const handleButtonClick = (connector: Connector) => {
    connectAsync({
      connector,
    })
      .catch((error: any) => {
        if (error?.message && /Connection request reset/i.test(error?.message)) {
          return
        }

        console.error(error)
      })
  }

  useEffect(() => {
    if (!isConnected && !isPending && isMobileDevice && window.ethereum) {
      const injectedConnectors = connectors.filter(({ type }) => type === 'injected')
      const eip6963Connectors = injectedConnectors.length > 1
        ? injectedConnectors.filter(({ id, name }) => id !== 'injected' && name !== 'Injected')
        : injectedConnectors

      const connector = eip6963Connectors.length ? eip6963Connectors[0] : injectedConnectors[0]

      if (connector) {
        handleButtonClick(connector)
      }
    }
  }, [ /* don't add deps, to only fire once on init */ ])

  useEffect(() => {
    if (!connector || !isConnected) {
      return
    }

    closeModal()

    onFinish?.()
  }, [ connector, isConnected ])

  let content: ReactNode

  // @ts-expect-error
  const walletIcon = variables?.connector?.icon
  const walletName = variables?.connector?.name

  if (isPending) {
    content = (
      <ActionScreen
        walletName={walletName}
        walletIcon={walletIcon}
        title={messages.waiting.title}
        text={messages.waiting.text}
        isPending
        reset={reset}
      />
    )
  }
  else if (isError) {
    let title: Intl.Message
    let text: Intl.Message

    if ('code' in error) {
      title = messages.errors[error.code]?.title
      text = messages.errors[error.code]?.text
    }

    content = (
      <ActionScreen
        walletName={walletName}
        walletIcon={walletIcon}
        title={title! || messages.errors.default.title}
        text={text! || messages.errors.default.text}
        isError
        reset={reset}
      />
    )
  }
  else {
    content = (
      <>
        <Message
          className="mb-4 text-heading-h4 text-center font-bold"
          value={messages.connect}
          tag="h2"
        />
        <div className="space-y-4">
          {
            canLogin ? (
              <div className="space-y-4">
                <p className="text-caption-13 text-grey-60 text-center">
                  Continue with Privy to use email, social login, embedded wallet, or WalletConnect.
                </p>
                <Button
                  className="w-full"
                  size={40}
                  title="Continue"
                  loading={!ready}
                  onClick={() => login()}
                />
              </div>
            ) : null
          }
          {
            connectors.length ? (
              <>
                {
                  canLogin ? (
                    <div className="flex items-center gap-3 text-caption-12 uppercase tracking-[0.16em] text-grey-60">
                      <div className="h-px flex-1 bg-white/10" />
                      <span>Browser wallets</span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>
                  ) : null
                }
                <Buttons onClick={handleButtonClick} />
              </>
            ) : null
          }
          {
            !canLogin && !connectors.length ? (
              <p className="text-caption-13 text-grey-60 text-center">
                Wallet connectors are not available yet. Refresh the page and try again.
              </p>
            ) : null
          }
        </div>
      </>
    )
  }

  return (
    <PlainModal closeModal={closeModal}>
      {content}
    </PlainModal>
  )
}

declare global {
  interface ModalsRegistry extends ExtendModalsRegistry<{ ConnectModal: typeof ConnectModal }> {}
}

export default ConnectModal
