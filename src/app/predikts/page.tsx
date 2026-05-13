import { PrediktsPage as PrediktsModulePage } from 'modules/predikts'
import { redirectLegacyBetHost } from 'shared/lib/redirectLegacyBetHost'


export default async function PrediktsPage() {
  await redirectLegacyBetHost('/predikts')

  return <PrediktsModulePage />
}
