import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { constants } from 'helpers'


const getHostname = async () => {
  const headersList = await headers()
  const forwardedHost = headersList.get('x-forwarded-host')
  const host = forwardedHost || headersList.get('host') || ''

  return host.split(':')[0].toLowerCase()
}

export const redirectLegacyBetHost = async (pathname: string) => {
  const hostname = await getHostname()

  if (hostname !== 'bet.prediktmarkets.com') {
    return
  }

  redirect(`${constants.links.appShell}${pathname}`)
}

export default redirectLegacyBetHost
