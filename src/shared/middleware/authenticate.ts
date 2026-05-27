import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../../modules/auth/auth.service'
import { AppError } from '../errors/AppError'

export interface AuthPayload {
  sub: string       // userId (cuid)
  username: string
  role: string
  iat: number
  exp: number
}

// Estende o tipo Request do Express para incluir o usuário autenticado
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

/**
 * Middleware de autenticação JWT.
 *
 * Uso: app.use('/rota-protegida', authenticate, router)
 *
 * Lê o token do header: Authorization: Bearer <token>
 * Em caso de sucesso, anexa o payload tipado em req.user.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Token de autenticação não informado.', 401))
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = verifyToken(token!) as AuthPayload
    req.user = payload
    next()
  } catch {
    next(new AppError('Token inválido ou expirado.', 401))
  }
}
