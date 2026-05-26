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

export const authService = {
  async login(username: string, password: string): Promise<void> {
    const res = await api.post<{ token: string }>('/auth/login', { username, password })
    const token = res.data.token
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token)
      setCookie(TOKEN_KEY, token, 8)
    }
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
