import { PrediktsMarketDetail } from 'modules/predikts'
import { redirectLegacyBetHost } from 'shared/lib/redirectLegacyBetHost'


type Props = {
  params: Promise<{
    slug: string
  }>
}

export default async function PrediktsMarketRoute({ params }: Props) {
  const { slug } = await params

  await redirectLegacyBetHost(`/predikts/${slug}`)

  return <PrediktsMarketDetail slug={slug} />
}
