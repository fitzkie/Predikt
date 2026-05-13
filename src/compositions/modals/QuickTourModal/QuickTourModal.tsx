'use client'

import type { ModalComponent } from '@locmod/modal'

import { PlainModal } from 'components/feedback'
import { Button } from 'components/inputs'
import { Icon } from 'components/ui'


const steps = [
  'Choose Sports for live and prematch action, or Predikt for event-driven markets.',
  'Connect a wallet or sign in with Privy to keep one account across the app shell.',
  'Fund your wallet, review pricing, and place a position with full balance and allowance guidance.',
  'Track open positions, payouts, referrals, and history from your profile.',
]

const QuickTourModal: ModalComponent = ({ closeModal }) => {
  return (
    <PlainModal className="wd:max-w-[34rem]" closeModal={() => closeModal(true)} overlayClosable withCloseButton>
      <div className="rounded-lg border border-white/10 bg-bg-l2 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-brand-50/15 text-brand-50">
            <Icon className="size-6" name="interface/info-circle" />
          </div>
          <div>
            <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">Quick Tour</div>
            <h2 className="mt-1 text-heading-h3 font-semibold text-grey-90">Get oriented in under a minute</h2>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {
            steps.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-md border border-white/8 bg-bg-l1 px-4 py-3">
                <div className="flex size-7 flex-none items-center justify-center rounded-full bg-brand-50/15 text-caption-12 font-semibold text-brand-50">
                  {index + 1}
                </div>
                <p className="text-caption-14 leading-6 text-grey-70">{step}</p>
              </div>
            ))
          }
        </div>
        <div className="mt-6 flex flex-col gap-3 ds:flex-row">
          <Button className="flex-1" size={40} title="Back to App" onClick={() => closeModal(true)} />
          <Button className="flex-1" size={40} style="secondary" title="Open Full Guide" to="/quick-tour" />
        </div>
      </div>
    </PlainModal>
  )
}

declare global {
  interface ModalsRegistry extends ExtendModalsRegistry<{ QuickTourModal: typeof QuickTourModal }> {}
}

export default QuickTourModal
