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
    return (
      <html lang="en">
        <body className={inter.className}>
          <main style={{
            minHeight: '100vh',
            background: '#0A0A0A',
            color: '#F5F5F5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            fontFamily: 'inherit',
          }}
          >
            <div style={{
              width: 'min(720px, 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '24px',
              padding: '32px',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
            }}
            >
              <p style={{ margin: 0, color: '#EBB437', fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                Predikt setup required
              </p>
              <h1 style={{ margin: '16px 0 0', fontSize: '40px', lineHeight: 1.05 }}>
                Missing Railway environment variables
              </h1>
              <p style={{ margin: '16px 0 0', color: '#C4C7CB', lineHeight: 1.7 }}>
                This app domain is live, but the wallet and Azuro integration variables are not fully configured yet.
                Add the variables below in Railway, then redeploy the service.
              </p>
              <ul style={{ margin: '24px 0 0', paddingLeft: '20px', color: '#F5F5F5', lineHeight: 1.8 }}>
                {
                  constants.missingAppEnv.map((item) => (
                    <li key={item}>
                      <code>{item}</code>
                    </li>
                  ))
                }
              </ul>
            </div>
          </main>
        </body>
      </html>
    )
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
