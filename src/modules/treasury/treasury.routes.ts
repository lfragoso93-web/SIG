import { Router } from 'express'
import {
  handleListAvailableBonds,
  handleListTreasuryBonds,
  handleGetTreasuryBond,
  handleCreateTreasuryBond,
  handleUpdateTreasuryBond,
  handleRedeemTreasuryBond,
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

/** Registra resgate parcial ou total de um título */
treasuryRouter.post('/:assetId/redeem', handleRedeemTreasuryBond)

/** Atualiza metadados (indexer, vencimento, isActive) */
treasuryRouter.patch('/:assetId', handleUpdateTreasuryBond)
