'use client'

import type { WidgetConfig } from '@lifi/widget'
import { ChainType, LiFiWidget } from '@lifi/widget'
import type { ModalComponent } from '@locmod/modal'
import { openModal } from '@locmod/modal'
import { polygon } from 'viem/chains'
import { useWallet } from 'wallet'

import { PlainModal } from 'components/feedback'


// USDC.e (bridged USDC) on Polygon — the collateral token used by Polymarket/Predikts
const USDC_E_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'

const widgetConfig: Partial<WidgetConfig> = {
  variant: 'compact',
  subvariant: 'default',
  appearance: 'dark',
  theme: {
    palette: {
      primary: { main: '#ED742E' },
      secondary: { main: '#111111' },
    },
    typography: { fontFamily: 'Inter, sans-serif' },
    container: {
      fontSize: '16px',
      boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.08)',
      borderRadius: '16px',
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { fontSize: '16px' },
          icon: { fontSize: '16px !important' },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { width: '16px', height: '16px' } },
      },
      MuiInputCard: undefined,
    },
    shape: { borderRadius: 8, borderRadiusSecondary: 8 },
  },
  disabledUI: [ 'toAddress' ],
  hiddenUI: [ 'appearance', 'walletMenu', 'poweredBy' ],
  walletConfig: {
    onConnect: () => { openModal('ConnectModal') },
  },
}

const PrediktsExchangeModal: ModalComponent = ({ closeModal }) => {
  const { account } = useWallet()

  if (!account) {
    return null
  }

  return (
    <PlainModal
      className="text-[16px] !bg-transparent"
      withCloseButton={false}
      closeModal={closeModal}
    >
      <LiFiWidget
        integrator="prediktmarkets"
        toToken={USDC_E_ADDRESS}
        toAddress={{ address: account, chainType: ChainType.EVM }}
        toChain={polygon.id}
        config={widgetConfig}
        open
        onClose={() => closeModal()}
      />
    </PlainModal>
  )
}

declare global {
  interface ModalsRegistry extends ExtendModalsRegistry<{ PrediktsExchangeModal: typeof PrediktsExchangeModal }> {}
}

export default PrediktsExchangeModal
