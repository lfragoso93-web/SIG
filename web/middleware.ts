import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas sempre liberadas
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Verifica token no cookie (para SSR) ou deixa o cliente redirecionar via interceptor
  const token = request.cookies.get('sig_token')?.value

  // Se não há token no cookie (client-side usa localStorage), deixa passar
  // O interceptor Axios cuida do redirecionamento em 401
  if (!token) {
    // Redireciona apenas se for navegação sem JS (bots, crawlers)
    const isNavigationRequest = request.headers.get('sec-fetch-mode') === 'navigate'
    if (isNavigationRequest) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
