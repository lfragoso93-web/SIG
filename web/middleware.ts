import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas e proxy da API sempre liberados
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Verifica presença de qualquer um dos cookies de sessão.
  // Agora que tudo é same-origin (via proxy /api/*), sig_token
  // chega corretamente em qualquer device/browser.
  const hasToken    = !!request.cookies.get('sig_token')?.value
  const hasAuthFlag = !!request.cookies.get('sig_auth')?.value

  if (!hasToken && !hasAuthFlag) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Exclui arquivos estáticos, imagens otimizadas e rotas de API (proxy)
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
