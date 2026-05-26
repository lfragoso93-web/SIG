import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // NEXT_PUBLIC_API_URL: acessível no browser — aponta para o host da API
  // Em produção, substitua pelo domínio público da API.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  },
}

export default nextConfig
