import { Router } from 'express'
import { allocationController } from './allocation.controller'

const router = Router()

// POST /allocation/calculate
router.post('/calculate', (req, res, next) =>
  allocationController.calculate(req, res, next)
)

export { router as allocationRouter }