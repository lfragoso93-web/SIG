import { api } from './api'

const TOKEN_KEY = 'sig_token'

function setCookie(name: string, value: string, hours = 8) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + hours * 3600 * 1000).toUTCString()
  document.cookie = `${name}=${value}; path=/; expires=${expires}; SameSite=Lax`
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

/**
 * Dispara snapshot de hoje de forma silenciosa (fire-and-forget).
 * Não bloqueia o login nem mostra erro ao usuário se falhar.
 */
async function triggerTodaySnapshot(): Promise<void> {
  try {
    await api.post('/portfolio-snapshots/generate', { period: 'DAILY' })
    console.log('[auth] Snapshot de hoje disparado após login.')
  } catch {
    // Silencioso — falha não impacta o usuário
    console.warn('[auth] Não foi possível gerar snapshot no login.')
  }
}

export const authService = {
  async login(username: string, password: string): Promise<void> {
    const res = await api.post<{ token: string }>('/auth/login', { username, password })
    const token = res.data.token
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token)
      setCookie(TOKEN_KEY, token, 8)
    }
    // Dispara snapshot do dia atual logo após o login (não aguarda)
    triggerTodaySnapshot()
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY)
      deleteCookie(TOKEN_KEY)
    }
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  },

  isAuthenticated(): boolean {
    return !!this.getToken()
  },
}
