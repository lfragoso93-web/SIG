import { api } from './api'

/**
 * Autenticação via cookie HttpOnly.
 *
 * O token NÃO é mais armazenado em localStorage — isso elimina a exposição
 * a ataques XSS. A API emite o cookie `sig_token` com as flags:
 *   - HttpOnly  → JS do browser não consegue ler
 *   - SameSite=Lax → protege contra CSRF
 *   - Secure    → HTTPS obrigatório em produção
 *
 * O Axios envia o cookie automaticamente em toda requisição via
 * `withCredentials: true` (configurado em api.ts).
 *
 * `isAuthenticated()` usa um cookie de sinalização NÃO-HttpOnly
 * (`sig_auth=1`) que o frontend pode ler apenas para saber se há
 * uma sessão ativa, sem expor o token em si.
 */

const AUTH_FLAG_KEY = 'sig_auth' // cookie legível pelo JS (não contém o token)

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

/**
 * Dispara snapshot de hoje de forma silenciosa (fire-and-forget).
 */
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
    // A API define o cookie HttpOnly `sig_token` automaticamente na resposta.
    // O frontend não precisa (nem consegue) ler o token.
    await api.post('/auth/login', { username, password })
    setAuthFlag(8)
    triggerTodaySnapshot()
  },

  async logout(): Promise<void> {
    try {
      // Pede à API para limpar o cookie HttpOnly no servidor
      await api.post('/auth/logout')
    } catch {
      // Silencioso — mesmo que a API falhe, limpamos o flag local
    } finally {
      clearAuthFlag()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
  },

  /**
   * Verifica existência da sessão pelo cookie de sinalização.
   * Não expõe o token JWT em si.
   */
  isAuthenticated(): boolean {
    return readCookie(AUTH_FLAG_KEY) === '1'
  },
}
