import { Router } from 'express'
import { dividendsController } from './dividends.controller'

const router = Router()

router.get('/summary', (req, res, next) => dividendsController.getSummary(req, res, next))

export { router as dividendsRouter }
