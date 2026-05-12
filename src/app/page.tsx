import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { MarketingHomePage } from 'modules/marketing'


const getHostname = async () => {
  const headersList = await headers()
  const forwardedHost = headersList.get('x-forwarded-host')
  const host = forwardedHost || headersList.get('host') || ''

  return host.split(':')[0].toLowerCase()
}

export default async function HomePage() {
  const hostname = await getHostname()

  if (hostname === 'bet.prediktmarkets.com') {
    redirect('/bet')
  }

  if (hostname === 'app.prediktmarkets.com') {
    redirect('/predikts')
  }

  return <MarketingHomePage />
}
