import { FastifyInstance } from 'fastify'
import { dividendsController } from './dividends.controller'

export async function dividendsRoutes(app: FastifyInstance) {
  app.get('/dividends/summary', dividendsController.getSummary)
  app.post('/dividends/sync',   dividendsController.sync)
}
