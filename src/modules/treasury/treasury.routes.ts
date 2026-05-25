import { Router } from 'express'
import {
  handleListAvailableBonds,
  handleListTreasuryBonds,
  handleGetTreasuryBond,
  handleCreateTreasuryBond,
  handleUpdateTreasuryBond,
} from './treasury.controller'

export const treasuryRouter = Router()

/** Lista títulos disponíveis no Tesouro Direto (via radaropcoes) */
treasuryRouter.get('/available', handleListAvailableBonds)

/** Lista posições do portfólio com P&L calculado */
treasuryRouter.get('/', handleListTreasuryBonds)

/** Detalhe de uma posição específica */
treasuryRouter.get('/:assetId', handleGetTreasuryBond)

/** Registra compra de um título */
treasuryRouter.post('/', handleCreateTreasuryBond)

/** Atualiza metadados (indexer, vencimento, isActive) */
treasuryRouter.patch('/:assetId', handleUpdateTreasuryBond)
