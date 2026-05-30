import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas sempre liberadas
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // `sig_token` é HttpOnly — legível pelo middleware Next.js (Edge Runtime).
  // `sig_auth` é o flag não-HttpOnly que o browser seta após o login.
  // Redireciona apenas navegações diretas sem nenhum dos dois cookies.
  const hasToken    = !!request.cookies.get('sig_token')?.value
  const hasAuthFlag = !!request.cookies.get('sig_auth')?.value

  if (!hasToken && !hasAuthFlag) {
    // Redireciona apenas navegações do browser (não requisições de API/assets).
    // Isso evita que fetch() calls do lado do cliente sejam redirecionados
    // e gerem loops infinitos.
    const isNavigation = request.headers.get('sec-fetch-mode') === 'navigate'
    if (isNavigation) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
