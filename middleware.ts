import { NextResponse, type NextRequest } from 'next/server'


const getHostname = (request: NextRequest) => {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host') || ''

  return host.split(':')[0].toLowerCase()
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname !== '/') {
    return NextResponse.next()
  }

  const hostname = getHostname(request)
  const url = request.nextUrl.clone()

  if (hostname === 'bet.prediktmarkets.com') {
    url.pathname = '/bet'

    return NextResponse.redirect(url)
  }

  if (hostname === 'app.prediktmarkets.com') {
    url.pathname = '/predikts'

    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/',
}
