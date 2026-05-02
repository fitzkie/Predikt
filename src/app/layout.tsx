import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import duration from 'dayjs/plugin/duration'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cookies, headers } from 'next/headers'
import { type ChainId } from '@azuro-org/toolkit'
import { constants } from 'helpers'
import { appChains } from 'wallet/chains'

import Providers from 'compositions/Providers/Providers'
import PageLayout from 'compositions/PageLayout/PageLayout'

import '../scss/globals.scss'


dayjs.extend(utc)
dayjs.extend(duration)

const inter = Inter({ subsets: [ 'latin' ] })

const AppDomainFallback = ({ hostname }: { hostname: string }) => {
  const isBetDomain = hostname === 'bet.prediktmarkets.com'
  const title = isBetDomain ? 'Sports Markets' : 'Predikts'
  const heading = isBetDomain ? 'Trade sports markets with a cleaner on-chain shell' : 'Browse prediction markets by category, not sportsbook convention'
  const body = isBetDomain
    ? 'The live wallet and Azuro execution layer is still being finalized in Railway, but the sports product surface is now available instead of crashing the domain.'
    : 'The prediction-market shell is available now while the live wallet and Azuro runtime configuration is being finalized in Railway.'
  const chips = isBetDomain
    ? [ 'NFL', 'UFC', 'Soccer', 'Live Markets', 'Prematch', 'On-chain Settlement' ]
    : constants.prediktsTaxonomy.map((category) => category.title)

  return (
    <html lang="en">
      <body className={inter.className}>
        <main style={{
          minHeight: '100vh',
          background: 'radial-gradient(circle at top, rgba(235,180,55,0.16), transparent 32rem), linear-gradient(180deg, #0A0A0A 0%, #111315 100%)',
          color: '#F5F5F5',
          padding: '32px',
          fontFamily: 'inherit',
        }}
        >
          <div style={{
            margin: '0 auto',
            width: 'min(1100px, 100%)',
          }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: '16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              paddingBottom: '20px',
            }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ color: '#F5F5F5', fontSize: '18px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  Predik
                </span>
                <span style={{ color: '#EBB437', fontSize: '18px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  t
                </span>
              </div>
              <div style={{ color: '#EBB437', fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                {title}
              </div>
            </div>

            <section style={{ padding: '56px 0 32px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                <span style={{ color: '#F5F5F5' }}>Predik</span>
                <span style={{ color: '#EBB437' }}>t</span>
              </p>
              <h1 style={{ margin: '16px auto 0', maxWidth: '900px', fontSize: 'clamp(3rem, 7vw, 5.75rem)', lineHeight: 0.94, letterSpacing: '-0.06em' }}>
                {heading}
              </h1>
              <p style={{ margin: '24px auto 0', maxWidth: '760px', color: '#C4C7CB', lineHeight: 1.8, fontSize: '18px' }}>
                {body}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '28px' }}>
                <a
                  href="https://prediktmarkets.com"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '46px',
                    padding: '0 20px',
                    borderRadius: '12px',
                    background: '#EBB437',
                    color: '#0A0A0A',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Main Site
                </a>
                <a
                  href={isBetDomain ? 'https://app.prediktmarkets.com' : 'https://bet.prediktmarkets.com'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '46px',
                    padding: '0 20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#EBB437',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {isBetDomain ? 'Open Predikts' : 'Open Sports'}
                </a>
              </div>
            </section>

            <section style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              paddingBottom: '32px',
            }}
            >
              {
                chips.map((chip) => (
                  <div
                    key={chip}
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '20px',
                      padding: '22px',
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
                    }}
                  >
                    <div style={{ color: '#F5F5F5', fontSize: '20px', fontWeight: 600, letterSpacing: '-0.03em' }}>{chip}</div>
                  </div>
                ))
              }
            </section>
          </div>
        </main>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(constants.baseUrl),
  title: {
    default: constants.companyName,
    template: `%s | ${constants.companyName}`,
  },
  description: 'Trade what happens next with real-time prediction markets, tokenized outcomes, and verified oracle settlement.',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const headersList = await headers()
  const cookieStore = await cookies()

  const userAgent = headersList.get('user-agent')
  const hostname = (headersList.get('x-forwarded-host') || headersList.get('host') || '').split(':')[0].toLowerCase()
  const isHostedAppDomain = hostname === 'bet.prediktmarkets.com' || hostname === 'app.prediktmarkets.com'
  const _initialChainId = cookieStore.get('appChainId')?.value
  const initialLiveState = JSON.parse(cookieStore.get('live')?.value || 'false')

  const initialChainId = _initialChainId &&
                  (appChains.find(chain => chain.id === +_initialChainId)?.id as ChainId) || constants.defaultChain.id

  if (isHostedAppDomain && !constants.hasRequiredAppEnv) {
    return <AppDomainFallback hostname={hostname} />
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers
          // initialState={initialState}
          userAgent={userAgent || ''}
          initialLiveState={initialLiveState}
          initialChainId={initialChainId}
        >
          <PageLayout>
            {children}
          </PageLayout>
        </Providers>
      </body>
    </html>
  )
}
