import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']

// Extensões/prefixos que NUNCA precisam de auth (estáticos, fontes, imagens)
const ASSET_EXTENSIONS = /\.(?:ico|png|jpg|jpeg|svg|gif|webp|woff2?|ttf|otf|css|js|map|json)$/i

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Rotas públicas sempre liberadas
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 2. Assets estáticos não precisam de auth
  if (ASSET_EXTENSIONS.test(pathname)) {
    return NextResponse.next()
  }

  const hasToken    = !!request.cookies.get('sig_token')?.value
  const hasAuthFlag = !!request.cookies.get('sig_auth')?.value

  if (!hasToken && !hasAuthFlag) {
    // Aceita navegações diretas de QUALQUER browser/device.
    // Antes dependia de `sec-fetch-mode === 'navigate'` que o Safari iOS
    // e alguns browsers Android não enviam consistentemente.
    // Agora: se não é uma requisição de API/dados internos do Next.js,
    // redireciona para login.
    const acceptHeader = request.headers.get('accept') ?? ''
    const isDataRequest = pathname.startsWith('/_next/data')
    const isApiRoute    = pathname.startsWith('/api')

    // Requisições que aceitam HTML são navegações do browser
    const isHtmlNavigation = acceptHeader.includes('text/html')

    if (!isDataRequest && !isApiRoute && isHtmlNavigation) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Para requisições que não aceitam HTML (fetch de dados do Next.js),
    // retorna 401 em vez de redirecionar (evita loop)
    if (!isDataRequest && !isApiRoute) {
      return new NextResponse(null, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
