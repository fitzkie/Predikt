import { GamePage as BetGamePage } from 'modules/bet'
import { redirectLegacyBetHost } from 'shared/lib/redirectLegacyBetHost'

type Props = {
  params: Promise<{
    sportSlug: string
    countrySlug: string
    leagueSlug: string
    gameId: string
  }>
}

export default async function GamePageRoute({ params }: Props) {
  const { sportSlug, countrySlug, leagueSlug, gameId } = await params

  await redirectLegacyBetHost(`/${sportSlug}/${countrySlug}/${leagueSlug}/${gameId}`)

  return <BetGamePage />
}
