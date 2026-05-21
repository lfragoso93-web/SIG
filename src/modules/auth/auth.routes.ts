import { Router } from 'express'
import { authController } from './auth.controller'

const router = Router()

// POST /auth/login → retorna JWT
router.post('/login', (req, res, next) => authController.post(req, res, next))

export { router as authRouter }
