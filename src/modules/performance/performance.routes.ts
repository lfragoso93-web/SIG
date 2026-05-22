import { Router } from 'express'
import { performanceController } from './performance.controller'

const router = Router()

router.get('/summary',        (req, res, next) => performanceController.getSummary(req, res, next))
router.get('/timeline',       (req, res, next) => performanceController.getTimeline(req, res, next))
router.get('/by-class',       (req, res, next) => performanceController.getByClass(req, res, next))
router.get('/monthly-report', (req, res, next) => performanceController.getMonthlyReport(req, res, next))

export { router as performanceRouter }
