import { BetPage as BetModulePage } from 'modules/bet'
import { redirectLegacyBetHost } from 'shared/lib/redirectLegacyBetHost'


export default async function BetPage() {
  await redirectLegacyBetHost('/bet')

  return <BetModulePage />
}
