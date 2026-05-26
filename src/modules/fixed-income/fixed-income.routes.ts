import { Router } from 'express'
import {
  createFixedIncomeHandler,
  listFixedIncomeHandler,
  getFixedIncomeHandler,
  redeemFixedIncomeHandler,
} from './fixed-income.controller'

export const fixedIncomeRouter = Router()

// POST   /fixed-income              → registrar nova aplicação
fixedIncomeRouter.post('/',                    createFixedIncomeHandler)

// GET    /fixed-income              → listar todas as posições ativas
fixedIncomeRouter.get('/',                     listFixedIncomeHandler)

// GET    /fixed-income/:assetId     → detalhar uma posição
fixedIncomeRouter.get('/:assetId',             getFixedIncomeHandler)

// POST   /fixed-income/:assetId/redeem → resgatar
fixedIncomeRouter.post('/:assetId/redeem',     redeemFixedIncomeHandler)
