import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../../modules/auth/auth.service'
import { UnauthorizedError } from '../errors/AppError'

/**
 * Middleware de autenticação JWT.
 *
 * Ordem de leitura do token:
 *   1. Cookie HttpOnly `sig_token`  (preferencial — resistente a XSS)
 *   2. Header `Authorization: Bearer <token>` (retrocompatibilidade / API calls diretos)
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const cookieToken = (req.cookies as Record<string, string>)?.['sig_token']
    const headerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined

    const token = cookieToken ?? headerToken

    if (!token) throw new UnauthorizedError('Token não fornecido.')

    const payload = verifyToken(token)
    ;(req as any).user = payload
    next()
  } catch {
    next(new UnauthorizedError('Token inválido ou expirado.'))
  }
}
