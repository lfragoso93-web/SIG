import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // `sig_token` é HttpOnly — o middleware do Next.js (que roda no Edge)
  // consegue ler cookies HttpOnly via `request.cookies`.
  // `sig_auth` é o flag legível pelo JS do browser.
  // Qualquer um deles é suficiente para considerar sessão ativa.
  const hasToken    = !!request.cookies.get('sig_token')?.value
  const hasAuthFlag = !!request.cookies.get('sig_auth')?.value

  if (!hasToken && !hasAuthFlag) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
