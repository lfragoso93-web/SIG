import { Request, Response } from 'express'
import { AssetClassesService } from './asset-classes.service'
import { updateAssetClassSchema } from './asset-classes.schema'
import { AppError } from '../../core/errors/app-error'

const assetClassesService = new AssetClassesService()

export class AssetClassesController {
  async listAll(req: Request, res: Response) {
    const classes = await assetClassesService.listAll()
    res.json(classes)
  }

  async findByCode(req: Request, res: Response) {
    const { code } = req.params
    const assetClass = await assetClassesService.findByCode(code)

    if (!assetClass) {
      throw new AppError(`Classe de ativo não encontrada: ${code}`, 404)
    }

    res.json(assetClass)
  }

  async updateByCode(req: Request, res: Response) {
    const { code } = req.params
    const body = updateAssetClassSchema.parse(req.body)
    const updated = await assetClassesService.updateByCode(code, body)
    res.json(updated)
  }
}
