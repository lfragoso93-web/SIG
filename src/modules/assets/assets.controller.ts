import { Request, Response } from 'express'
import { AssetsService } from './assets.service'

const assetsService = new AssetsService()

export class AssetsController {
  async listAll(req: Request, res: Response) {
    try {
      const data = await assetsService.listAll()
      return res.status(200).json(data)
    } catch (error) {
      console.error('Erro ao listar ativos:', error)
      return res.status(500).json({ message: 'Erro interno ao listar ativos.' })
    }
  }

  async findByTicker(req: Request, res: Response) {
    try {
      const ticker = String(req.params.ticker).trim().toUpperCase()
      const data = await assetsService.findByTicker(ticker)

      if (!data) {
        return res.status(404).json({ message: 'Ativo não encontrado.' })
      }

      return res.status(200).json(data)
    } catch (error) {
      console.error('Erro ao buscar ativo:', error)
      return res.status(500).json({ message: 'Erro interno ao buscar ativo.' })
    }
  }

  async create(req: Request, res: Response) {
    try {
      const {
        ticker,
        name,
        assetClassId,
        assetType,
        isin,
        currencyCode,
        exchange,
        sector,
        segment,
        issuer,
        isActive,
        notes,
        maturityDate,
        indexer,
      } = req.body

      // Campos sempre obrigatórios
      if (!name || !assetClassId || !assetType) {
        return res.status(400).json({
          message: 'Os campos name, assetClassId e assetType são obrigatórios.',
        })
      }

      // Para ativos que não são Tesouro Direto, ticker é obrigatório
      const isTesouro =
        String(assetType).toUpperCase() === 'BOND' &&
        String(issuer ?? '').trim() === 'Tesouro Nacional'

      if (!isTesouro && !ticker) {
        return res.status(400).json({
          message: 'O campo ticker é obrigatório para ativos que não são Tesouro Direto.',
        })
      }

      // Para Tesouro Direto, indexer e maturityDate são obrigatórios
      if (isTesouro && (!indexer || !maturityDate)) {
        return res.status(400).json({
          message:
            'Para Tesouro Direto, os campos indexer e maturityDate são obrigatórios.',
        })
      }

      const data = await assetsService.create({
        ticker:       ticker ? String(ticker).trim().toUpperCase() : undefined,
        name:         String(name).trim(),
        assetClassId: String(assetClassId).trim(),
        assetType:    String(assetType).trim().toUpperCase(),
        isin:         isin        ? String(isin).trim().toUpperCase()        : undefined,
        currencyCode: currencyCode ? String(currencyCode).trim().toUpperCase() : undefined,
        exchange:     exchange    ? String(exchange).trim()                  : undefined,
        sector:       sector      ? String(sector).trim()                    : undefined,
        segment:      segment     ? String(segment).trim()                   : undefined,
        issuer:       issuer      ? String(issuer).trim()                    : undefined,
        isActive:     isActive    !== undefined ? Boolean(isActive)          : undefined,
        notes:        notes       ? String(notes).trim()                     : undefined,
        maturityDate: maturityDate ? String(maturityDate).trim()             : undefined,
        indexer:      indexer     ? String(indexer).trim().toUpperCase()     : undefined,
      })

      return res.status(201).json(data)
    } catch (error) {
      console.error('Erro ao criar ativo:', error)
      return res.status(500).json({
        message: 'Erro interno ao criar ativo.',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    }
  }

  async updateByTicker(req: Request, res: Response) {
    try {
      const ticker = String(req.params.ticker).trim().toUpperCase()
      const {
        name,
        normalizedName,
        assetType,
        assetClassId,
        isin,
        currencyCode,
        exchange,
        sector,
        segment,
        issuer,
        isActive,
        notes,
        maturityDate,
        indexer,
      } = req.body

      const payload: Record<string, unknown> = {}

      if (name            !== undefined) payload.name            = String(name).trim()
      if (normalizedName  !== undefined) payload.normalizedName  = String(normalizedName).trim()
      if (assetType       !== undefined) payload.assetType       = String(assetType).trim().toUpperCase()
      if (assetClassId    !== undefined) payload.assetClassId    = String(assetClassId).trim()
      if (isin            !== undefined) payload.isin            = String(isin).trim().toUpperCase()
      if (currencyCode    !== undefined) payload.currencyCode    = String(currencyCode).trim().toUpperCase()
      if (exchange        !== undefined) payload.exchange        = String(exchange).trim()
      if (sector          !== undefined) payload.sector          = String(sector).trim()
      if (segment         !== undefined) payload.segment         = String(segment).trim()
      if (issuer          !== undefined) payload.issuer          = String(issuer).trim()
      if (isActive        !== undefined) payload.isActive        = Boolean(isActive)
      if (notes           !== undefined) payload.notes           = String(notes).trim()
      if (maturityDate    !== undefined) payload.maturityDate    = String(maturityDate).trim()
      if (indexer         !== undefined) payload.indexer         = String(indexer).trim().toUpperCase()

      if (Object.keys(payload).length === 0) {
        return res.status(400).json({
          message: 'Informe ao menos um campo para atualização.',
        })
      }

      const data = await assetsService.updateByTicker(ticker, payload)

      return res.status(200).json(data)
    } catch (error) {
      console.error('Erro ao atualizar ativo:', error)
      return res.status(500).json({
        message: 'Erro interno ao atualizar ativo.',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    }
  }

  async deleteByTicker(req: Request, res: Response) {
    try {
      const ticker = String(req.params.ticker).trim().toUpperCase()
      await assetsService.deleteByTicker(ticker)
      return res.status(204).send()
    } catch (error) {
      console.error('Erro ao excluir ativo:', error)
      return res.status(500).json({
        message: 'Erro interno ao excluir ativo.',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    }
  }
}
