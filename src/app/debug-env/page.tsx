import { headers } from 'next/headers'


const mask = (value?: string) => {
  if (!value) {
    return '(missing)'
  }

  if (value.length <= 10) {
    return `${value.slice(0, 2)}...${value.slice(-2)}`
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

export default async function DebugEnvPage() {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || '(unknown)'

  const rows = [
    [ 'host', host ],
    [ 'NEXT_PUBLIC_PRIVY_APP_ID', mask(process.env.NEXT_PUBLIC_PRIVY_APP_ID) ],
    [ 'NEXT_PUBLIC_WALLETCONNECT_ID', mask(process.env.NEXT_PUBLIC_WALLETCONNECT_ID) ],
    [ 'NEXT_PUBLIC_AFFILIATE_ADDRESS', mask(process.env.NEXT_PUBLIC_AFFILIATE_ADDRESS) ],
    [ 'NEXT_PUBLIC_BASE_URL', mask(process.env.NEXT_PUBLIC_BASE_URL) ],
    [ 'NEXT_PUBLIC_SPORTS_APP_URL', mask(process.env.NEXT_PUBLIC_SPORTS_APP_URL) ],
    [ 'NEXT_PUBLIC_PREDIKTS_APP_URL', mask(process.env.NEXT_PUBLIC_PREDIKTS_APP_URL) ],
    [ 'NEXT_PUBLIC_COMPANY_NAME', process.env.NEXT_PUBLIC_COMPANY_NAME || '(missing)' ],
    [ 'AZURO_UNSTABLE_DEV_ENABLED', process.env.AZURO_UNSTABLE_DEV_ENABLED || '(missing)' ],
  ]

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      color: '#F5F5F5',
      padding: '32px',
      fontFamily: 'Inter, sans-serif',
    }}
    >
      <div style={{
        margin: '0 auto',
        width: 'min(960px, 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '32px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
      }}
      >
        <p style={{ margin: 0, color: '#EBB437', fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Railway runtime debug
        </p>
        <h1 style={{ margin: '16px 0 0', fontSize: '40px', lineHeight: 1.05 }}>
          Predikt env inspection
        </h1>
        <p style={{ margin: '16px 0 24px', color: '#C4C7CB', lineHeight: 1.7 }}>
          This page shows what the running Railway service can actually read at request time.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {
              rows.map(([ key, value ]) => (
                <tr key={key}>
                  <td style={{ padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.08)', color: '#C4C7CB', width: '40%' }}>{key}</td>
                  <td style={{ padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.08)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{value}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </main>
  )
}
