import { Router } from 'express'
import { AssetsController } from './assets.controller'

const router = Router()
const assetsController = new AssetsController()

router.get('/', (req, res) => assetsController.listAll(req, res))
router.post('/', (req, res) => assetsController.create(req, res))
router.get('/:ticker', (req, res) => assetsController.findByTicker(req, res))
router.patch('/:ticker', (req, res) => assetsController.updateByTicker(req, res))
router.delete('/:ticker', (req, res) => assetsController.deleteByTicker(req, res))

export { router as assetsRouter }