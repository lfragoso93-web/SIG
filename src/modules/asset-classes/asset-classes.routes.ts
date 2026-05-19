import { Router } from 'express'
import { AssetClassesController } from './asset-classes.controller'

const router = Router()
const assetClassesController = new AssetClassesController()

router.get('/', (req, res) => assetClassesController.listAll(req, res))
router.get('/:code', (req, res) => assetClassesController.findByCode(req, res))

export { router as assetClassesRouter }