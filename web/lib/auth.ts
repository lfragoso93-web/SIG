import { api } from './api'

/**
 * Autenticação via cookie HttpOnly.
 *
 * Com o proxy Next.js em /api/*, o login agora é same-origin:
 * - O browser faz POST /api/auth/login
 * - O proxy repassa para a API interna
 * - A API responde com Set-Cookie: sig_token (HttpOnly, SameSite=Lax)
 * - O browser aceita o cookie normalmente pois a origem é a mesma
 *
 * `sig_auth` é um cookie não-HttpOnly que o middleware Next.js
 * consegue ler para validar a sessão sem expor o JWT.
 */

const AUTH_FLAG_KEY = 'sig_auth'

function setAuthFlag(hours = 8) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + hours * 3600 * 1000).toUTCString()
  document.cookie = `${AUTH_FLAG_KEY}=1; path=/; expires=${expires}; SameSite=Lax`
}

function clearAuthFlag() {
  if (typeof document === 'undefined') return
  document.cookie = `${AUTH_FLAG_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))  
  return match ? decodeURIComponent(match[1]) : null
}

async function triggerTodaySnapshot(): Promise<void> {
  try {
    await api.post('/portfolio-snapshots/generate', { period: 'DAILY' })
    console.log('[auth] Snapshot de hoje disparado após login.')
  } catch {
    console.warn('[auth] Não foi possível gerar snapshot no login.')
  }
}

export const authService = {
  async login(username: string, password: string): Promise<void> {
    await api.post('/auth/login', { username, password })
    setAuthFlag(8)
    triggerTodaySnapshot()
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } catch {
      // silencioso
    } finally {
      clearAuthFlag()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
  },

  isAuthenticated(): boolean {
    return readCookie(AUTH_FLAG_KEY) === '1'
  },
}
