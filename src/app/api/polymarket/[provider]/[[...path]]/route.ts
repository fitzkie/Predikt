import { NextResponse } from 'next/server'


const PROVIDER_BASES = {
  gamma: 'https://gamma-api.polymarket.com',
  data: 'https://data-api.polymarket.com',
  clob: 'https://clob.polymarket.com',
} as const

type ProviderKey = keyof typeof PROVIDER_BASES

const sanitizePath = (segments?: string[]) => {
  return (segments || [])
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/')
}

const buildUpstreamUrl = (provider: ProviderKey, pathSegments: string[] | undefined, requestUrl: string) => {
  const upstream = new URL(PROVIDER_BASES[provider])
  const sanitizedPath = sanitizePath(pathSegments)

  upstream.pathname = sanitizedPath ? `${upstream.pathname.replace(/\/$/, '')}/${sanitizedPath}` : upstream.pathname

  const sourceUrl = new URL(requestUrl)

  sourceUrl.searchParams.forEach((value, key) => {
    upstream.searchParams.append(key, value)
  })

  return upstream
}

const proxyRequest = async (
  request: Request,
  { params }: { params: Promise<{ provider: string, path?: string[] }> },
) => {
  const { provider, path } = await params

  if (!(provider in PROVIDER_BASES)) {
    return NextResponse.json({ error: 'Unsupported Polymarket provider' }, { status: 400 })
  }

  const upstreamUrl = buildUpstreamUrl(provider as ProviderKey, path, request.url)
  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers: {
      Accept: request.headers.get('accept') || 'application/json',
      'Content-Type': request.headers.get('content-type') || 'application/json',
    },
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
    cache: 'no-store',
  })

  const responseHeaders = new Headers()
  const contentType = upstreamResponse.headers.get('content-type')

  if (contentType) {
    responseHeaders.set('content-type', contentType)
  }

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  })
}

export const GET = proxyRequest
export const POST = proxyRequest
