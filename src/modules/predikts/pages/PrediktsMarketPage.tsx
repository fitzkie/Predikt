'use client'

import PrediktsMarketDetail from '../components/PrediktsMarketDetail'


type Props = {
  slug: string
}

export default function PrediktsMarketPage({ slug }: Props) {
  return <PrediktsMarketDetail slug={slug} />
}
