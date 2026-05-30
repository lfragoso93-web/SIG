import type { Request, Response, NextFunction } from 'express'
import { calcIrpf } from './irpf.service'

export class IrpfController {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const year = Number(req.query.year ?? new Date().getFullYear())
      if (isNaN(year) || year < 2000 || year > 2100) {
        return res.status(400).json({ message: 'Parâmetro year inválido.' })
      }
      const data = await calcIrpf(year)
      return res.json(data)
    } catch (err) {
      next(err)
    }
  }
}

export default new IrpfController()
