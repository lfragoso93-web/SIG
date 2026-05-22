import { Router }               from 'express'
import { dividendsController }  from './dividends.controller'

export const dividendsRouter = Router()

dividendsRouter.get('/summary', dividendsController.getSummary)
dividendsRouter.post('/sync',   dividendsController.sync)
