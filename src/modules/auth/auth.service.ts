import jwt from 'jsonwebtoken'
import { LoginInput } from './auth.schema'
import { ValidationError } from '../../shared/errors/AppError'

const JWT_SECRET  = process.env.JWT_SECRET  ?? 'change_this_secret_in_production'
const JWT_EXPIRES = process.env.JWT_EXPIRES ?? '8h'

/**
 * Autenticação simples por usuário/senha configurados em variáveis de ambiente.
 *
 * Para múltiplos usuários futuros, substitua esta função por uma consulta
 * ao banco (model User com bcrypt).
 */
export function login(data: LoginInput): { token: string; expiresIn: string } {
  const validUser = process.env.APP_USERNAME ?? 'admin'
  const validPass = process.env.APP_PASSWORD ?? 'change_this_password'

  if (data.username !== validUser || data.password !== validPass) {
    throw new ValidationError('Credenciais inválidas.')
  }

  const token = jwt.sign({ sub: data.username, role: 'admin' }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  } as jwt.SignOptions)

  return { token, expiresIn: JWT_EXPIRES }
}

export function verifyToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload
}
