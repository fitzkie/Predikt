import { PrediktsMarketDetail } from 'modules/predikts'


type Props = {
  params: Promise<{
    slug: string
  }>
}

export default async function PrediktsMarketRoute({ params }: Props) {
  const { slug } = await params

  return <PrediktsMarketDetail slug={slug} />
}
