import { NextFunction, Request, Response } from 'express'
import {
  performanceSummaryQuerySchema,
  performanceTimelineQuerySchema,
  performanceByClassQuerySchema,
} from './performance.schema'
import { performanceService } from './performance.service'

export class PerformanceController {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const query = performanceSummaryQuerySchema.parse(req.query)
      const result = await performanceService.getSummary(query)

      return res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async getTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const query = performanceTimelineQuerySchema.parse(req.query)
      const result = await performanceService.getTimeline(query)

      return res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  async getByClass(req: Request, res: Response, next: NextFunction) {
    try {
      const query = performanceByClassQuerySchema.parse(req.query)
      const result = await performanceService.getByClass(query)

      return res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }
}

export const performanceController = new PerformanceController()