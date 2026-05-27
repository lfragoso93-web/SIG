import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from '../../core/prisma/prisma.service'
import { LoginInput } from './auth.schema'
import { UnauthorizedError } from '../../shared/errors/AppError'

const JWT_SECRET  = process.env.JWT_SECRET
const JWT_EXPIRES = process.env.JWT_EXPIRES ?? '8h'

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET não definida. Configure a variável de ambiente antes de iniciar o servidor.')
}

/**
 * Autentica um usuário consultando a tabela User no banco.
 * A senha é comparada com o hash bcrypt armazenado.
 */
export async function login(data: LoginInput): Promise<{ token: string; expiresIn: string }> {
  const user = await prisma.user.findUnique({
    where: { username: data.username },
  })

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Credenciais inválidas.')
  }

  const passwordMatch = await bcrypt.compare(data.password, user.passwordHash)
  if (!passwordMatch) {
    throw new UnauthorizedError('Credenciais inválidas.')
  }

  // Atualiza lastLoginAt de forma não-bloqueante
  prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  }).catch(() => { /* silencioso — não impede o login */ })

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES } as jwt.SignOptions,
  )

  return { token, expiresIn: JWT_EXPIRES }
}

export function verifyToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, JWT_SECRET!) as jwt.JwtPayload
}
