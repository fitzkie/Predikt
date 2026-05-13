import { SportPage as BetSportPage } from 'modules/bet'
import { redirectLegacyBetHost } from 'shared/lib/redirectLegacyBetHost'

type Props = {
  params: Promise<{
    sportSlug: string
  }>
}

export default async function SportPageRoute({ params }: Props) {
  const { sportSlug } = await params

  await redirectLegacyBetHost(`/${sportSlug}`)

  return <BetSportPage />
}
