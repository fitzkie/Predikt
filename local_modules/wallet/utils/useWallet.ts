'use client'

import { useChains, useAccount as useWagmiAccount } from 'wagmi'
import { useAAWalletClient, useAccount as useSdkAccount } from '@azuro-org/sdk-social-aa-connector'
import { useOptionalPrivy } from 'providers/auth'
import { ConnectorName } from 'wallet'


export const useWallet = () => {
  const { authenticated } = useOptionalPrivy()
  const wagmiAccount = useWagmiAccount()
  const chains = useChains()

  let address = wagmiAccount.address
  let connector = wagmiAccount.connector
  let isConnected = wagmiAccount.isConnected
  let isConnecting = wagmiAccount.isConnecting
  let isReconnecting = wagmiAccount.isReconnecting
  let chain = wagmiAccount.chain
  let chainId = wagmiAccount.chainId
  let isAAWallet = false
  let isReady = true
  let aaWalletClient

  try {
    const sdkAccount = useSdkAccount()
    aaWalletClient = useAAWalletClient()

    address = sdkAccount.address ?? address
    connector = sdkAccount.connector ?? connector
    isConnected = sdkAccount.isConnected
    isConnecting = sdkAccount.isConnecting
    isReconnecting = sdkAccount.isReconnecting
    chain = (sdkAccount.chain as typeof chain) ?? chain
    chainId = sdkAccount.chainId ?? chainId
    isAAWallet = sdkAccount.isAAWallet
    isReady = sdkAccount.isReady
  }
  catch {
    aaWalletClient = undefined
  }

  const isWalletConnect = connector?.name === ConnectorName.WalletConnect

  return {
    account: address,
    connector,
    aaWalletClient,
    chain,
    chains,
    chainId,
    isConnected,
    isConnecting,
    isReconnecting,
    isWalletConnect,
    isAAWallet,
    isReady,
  }
}
