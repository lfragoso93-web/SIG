import { Request, Response, NextFunction } from 'express'
import { performanceService } from './performance.service'
import {
  performanceSummaryQuerySchema,
  performanceTimelineQuerySchema,
  performanceByClassQuerySchema,
} from './performance.schema'
import { AuthPayload } from '../../shared/middleware/authenticate'

function userId(req: Request): string {
  return (req.user as AuthPayload).sub
}

export class PerformanceController {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const query  = performanceSummaryQuerySchema.parse(req.query)
      const result = await performanceService.getSummary(userId(req), query)
      res.json(result)
    } catch (err) { next(err) }
  }

  async getTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const query  = performanceTimelineQuerySchema.parse(req.query)
      const result = await performanceService.getTimeline(userId(req), query)
      res.json(result)
    } catch (err) { next(err) }
  }

  async getByClass(req: Request, res: Response, next: NextFunction) {
    try {
      const query  = performanceByClassQuerySchema.parse(req.query)
      const result = await performanceService.getByClass(userId(req), query)
      res.json(result)
    } catch (err) { next(err) }
  }
}

export const performanceController = new PerformanceController()
