import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../../modules/auth/auth.service'
import { AppError } from '../errors/AppError'

export interface AuthPayload {
  sub: string
  username: string
  role: string
  iat: number
  exp: number
}

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
 * Ordem de leitura do token:
 *   1. Cookie HttpOnly `sig_token`  (preferencial — resistente a XSS)
 *   2. Header `Authorization: Bearer <token>` (retrocompatibilidade / Postman / cron jobs)
 *
 * Em caso de sucesso, anexa o payload tipado em req.user.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const cookieToken = (req.cookies as Record<string, string>)?.['sig_token']
  const authHeader  = req.headers.authorization
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined

  const token = cookieToken ?? headerToken

  if (!token) {
    return next(new AppError('Token de autenticação não informado.', 401))
  }

  try {
    const payload = verifyToken(token) as AuthPayload
    req.user = payload
    next()
  } catch {
    next(new AppError('Token inválido ou expirado.', 401))
  }
}
