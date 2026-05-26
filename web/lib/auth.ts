import { api } from './api'

const TOKEN_KEY = 'sig_token'

export const authService = {
  async login(username: string, password: string): Promise<void> {
    const res = await api.post<{ token: string }>('/auth/login', { username, password })
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, res.data.token)
    }
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY)
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
