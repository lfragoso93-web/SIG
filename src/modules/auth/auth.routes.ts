import { Router } from 'express'
import { authController } from './auth.controller'

const router = Router()

router.post('/login',  (req, res, next) => authController.post(req, res, next))
router.post('/logout', (req, res, next) => authController.logout(req, res, next))

// Named export para compatibilidade com o index.ts
export const authRouter = router
