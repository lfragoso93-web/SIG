import { Request, Response, NextFunction } from 'express'
import { loginSchema } from './auth.schema'
import { login } from './auth.service'

export class AuthController {
  post(req: Request, res: Response, next: NextFunction) {
    try {
      const input  = loginSchema.parse(req.body)
      const result = login(input)
      return res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }
}

export const authController = new AuthController()
