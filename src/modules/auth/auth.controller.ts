import { Request, Response, NextFunction } from 'express'
import { loginSchema } from './auth.schema'
import { login } from './auth.service'

const COOKIE_NAME    = 'sig_token'
const COOKIE_MAX_AGE = 8 * 60 * 60 * 1000 // 8 horas em ms

export class AuthController {
  async post(req: Request, res: Response, next: NextFunction) {
    try {
      const input  = loginSchema.parse(req.body)
      const result = await login(input)

      // Emite o token como cookie HttpOnly — JS do browser não consegue ler.
      // Em produção (NODE_ENV=production) o cookie exige HTTPS (secure: true).
      res.cookie(COOKIE_NAME, result.token, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   COOKIE_MAX_AGE,
        path:     '/',
      })

      // Ainda retorna o token no body para retrocompatibilidade com clientes
      // que já estejam em execução. O frontend será migrado para ler apenas o cookie.
      return res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie('sig_token', { path: '/' })
      return res.status(204).send()
    } catch (err) {
      next(err)
    }
  }
}

export const authController = new AuthController()
