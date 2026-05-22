import { NextFunction, Request, Response } from 'express'
import { dividendsSummaryQuerySchema } from './dividends.schema'
import { dividendsService }            from './dividends.service'

export class DividendsController {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const query  = dividendsSummaryQuerySchema.parse(req.query)
      const result = await dividendsService.getSummary(query)
      return res.status(200).json(result)
    } catch (err) { next(err) }
  }
}

export const dividendsController = new DividendsController()
