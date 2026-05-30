import { Router } from 'express'
import irpfController from './irpf.controller'

export const irpfRouter = Router()

// GET /irpf?year=2025
irpfRouter.get('/', (req, res, next) => irpfController.getSummary(req, res, next))
