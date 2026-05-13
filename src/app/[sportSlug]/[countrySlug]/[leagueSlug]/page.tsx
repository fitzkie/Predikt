import { LeaguePage as BetLeaguePage } from 'modules/bet'
import { redirectLegacyBetHost } from 'shared/lib/redirectLegacyBetHost'

type Props = {
  params: Promise<{
    sportSlug: string
    countrySlug: string
    leagueSlug: string
  }>
}

export default async function LeaguePageRoute({ params }: Props) {
  const { sportSlug, countrySlug, leagueSlug } = await params

  await redirectLegacyBetHost(`/${sportSlug}/${countrySlug}/${leagueSlug}`)

  return <BetLeaguePage />
}
