import { Request, Response, NextFunction } from 'express'
import { allocationBodySchema, allocationQuerySchema } from './allocation.schema'
import { allocationService } from './allocation.service'

export class AllocationController {
  async calculate(req: Request, res: Response, next: NextFunction) {
    try {
      const query = allocationQuerySchema.parse(req.query)
      const body = allocationBodySchema.parse(req.body)

      const result = await allocationService.calculate(query, body)

      return res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }
}

export const allocationController = new AllocationController()