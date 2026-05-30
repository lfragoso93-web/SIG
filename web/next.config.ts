import type { NextConfig } from 'next'

// URL interna da API — usada APENAS pelo proxy server-side e pelo SSR.
// O browser NUNCA acessa a API diretamente; tudo passa pelo proxy /api/*.
const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? 'http://api:3000'

const nextConfig: NextConfig = {
  output: 'standalone',

  // Proxy transparente: qualquer chamada do browser para /api/* é
  // reescrita para a API interna. Assim o browser ve a mesma origem
  // e o cookie sig_token (SameSite=Lax / HttpOnly) funciona em
  // qualquer device, sem problemas de CORS ou cross-site.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${INTERNAL_API_URL}/:path*`,
      },
    ]
  },
}

export default nextConfig
