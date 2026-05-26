import type { FastifyInstance } from 'fastify'
import {
  createFixedIncomeHandler,
  listFixedIncomeHandler,
  getFixedIncomeHandler,
  redeemFixedIncomeHandler,
} from './fixed-income.controller'

export async function fixedIncomeRoutes(app: FastifyInstance) {
  // POST   /fixed-income          → registrar nova aplicação
  app.post('/', createFixedIncomeHandler)

  // GET    /fixed-income          → listar todas as posições ativas
  app.get('/', listFixedIncomeHandler)

  // GET    /fixed-income/:assetId → detalhar uma posição
  app.get('/:assetId', getFixedIncomeHandler)

  // POST   /fixed-income/:assetId/redeem → resgatar
  app.post('/:assetId/redeem', redeemFixedIncomeHandler)
}
