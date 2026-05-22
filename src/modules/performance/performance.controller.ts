import { NextFunction, Request, Response } from 'express'
import {
  performanceSummaryQuerySchema,
  performanceTimelineQuerySchema,
  performanceByClassQuerySchema,
  monthlyReportQuerySchema,
} from './performance.schema'
import { performanceService }    from './performance.service'
import { monthlyReportService }  from './monthly-report.service'

export class PerformanceController {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const query  = performanceSummaryQuerySchema.parse(req.query)
      const result = await performanceService.getSummary(query)
      return res.status(200).json(result)
    } catch (err) { next(err) }
  }

  async getTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const query  = performanceTimelineQuerySchema.parse(req.query)
      const result = await performanceService.getTimeline(query)
      return res.status(200).json(result)
    } catch (err) { next(err) }
  }

  async getByClass(req: Request, res: Response, next: NextFunction) {
    try {
      const query  = performanceByClassQuerySchema.parse(req.query)
      const result = await performanceService.getByClass(query)
      return res.status(200).json(result)
    } catch (err) { next(err) }
  }

  async getMonthlyReport(req: Request, res: Response, next: NextFunction) {
    try {
      const query  = monthlyReportQuerySchema.parse(req.query)
      const result = await monthlyReportService.getMonthlyReport(query)
      return res.status(200).json(result)
    } catch (err) { next(err) }
  }
}

export const performanceController = new PerformanceController()
