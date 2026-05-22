import { Request, Response } from 'express'
import { AssetClassesService } from './asset-classes.service'
import { updateAssetClassSchema } from './asset-classes.schema'

const assetClassesService = new AssetClassesService()

export class AssetClassesController {
  async listAll(req: Request, res: Response) {
    const classes = await assetClassesService.listAll()
    res.json(classes)
  }

  async findByCode(req: Request, res: Response) {
    const code = req.params['code'] as string
    const assetClass = await assetClassesService.findByCode(code)

    if (!assetClass) {
      res.status(404).json({ message: `Classe de ativo não encontrada: ${code}` })
      return
    }

    res.json(assetClass)
  }

  async updateByCode(req: Request, res: Response) {
    const code = req.params['code'] as string
    const body = updateAssetClassSchema.parse(req.body)
    const updated = await assetClassesService.updateByCode(code, body)
    res.json(updated)
  }
}
