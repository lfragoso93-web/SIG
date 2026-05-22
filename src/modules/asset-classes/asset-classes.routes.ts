import { Router } from 'express'
import { AssetClassesController } from './asset-classes.controller'

const router = Router()
const assetClassesController = new AssetClassesController()

router.get('/', (req, res) => assetClassesController.listAll(req, res))
router.get('/:code', (req, res) => assetClassesController.findByCode(req, res))
router.patch('/:code', (req, res) => assetClassesController.updateByCode(req, res))

export { router as assetClassesRouter }
