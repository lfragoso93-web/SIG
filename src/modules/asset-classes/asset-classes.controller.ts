import { Request, Response } from 'express'
import { AssetClassesService } from './asset-classes.service'

const assetClassesService = new AssetClassesService()

export class AssetClassesController {
  async listAll(req: Request, res: Response) {
    try {
      const data = await assetClassesService.listAll()
      return res.status(200).json(data)
    } catch (error) {
      console.error('Erro ao listar classes de ativos:', error)
      return res.status(500).json({
        message: 'Erro interno ao listar classes de ativos.',
      })
    }
  }

  async findByCode(req: Request, res: Response) {
    try {
      const { code } = req.params
      const data = await assetClassesService.findByCode(code)

      if (!data) {
        return res.status(404).json({
          message: 'Classe de ativo não encontrada.',
        })
      }

      return res.status(200).json(data)
    } catch (error) {
      console.error('Erro ao buscar classe de ativo:', error)
      return res.status(500).json({
        message: 'Erro interno ao buscar classe de ativo.',
      })
    }
  }
}