import { describe, it, expect, beforeEach } from 'vitest'
import { login } from '../auth.service'

beforeEach(() => {
  process.env.APP_USERNAME = 'admin'
  process.env.APP_PASSWORD = 'senha_teste_123'
  process.env.JWT_SECRET   = 'secret_para_testes'
})

describe('auth.service — login', () => {
  it('retorna token para credenciais válidas', () => {
    const result = login({ username: 'admin', password: 'senha_teste_123' })
    expect(result).toHaveProperty('token')
    expect(typeof result.token).toBe('string')
    expect(result.token.split('.').length).toBe(3) // JWT tem 3 partes
  })

  it('lança ValidationError para senha errada', () => {
    expect(() => login({ username: 'admin', password: 'errada' })).toThrow(
      'Credenciais inválidas.',
    )
  })

  it('lança ValidationError para usuário errado', () => {
    expect(() => login({ username: 'hacker', password: 'senha_teste_123' })).toThrow(
      'Credenciais inválidas.',
    )
  })
})
