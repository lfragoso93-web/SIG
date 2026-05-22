import { Request, Response, NextFunction } from 'express'
import { dividendsService }                from './dividends.service'
import { syncAllDividends, syncDividendsForTicker } from './dividends.sync.service'
import { DividendsSummaryQueryInput }      from './dividends.schema'
import { z }                               from 'zod'

const syncBodySchema = z.object({
  ticker: z.string().optional(),
})

export const dividendsController = {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as DividendsSummaryQueryInput
      const data  = await dividendsService.getSummary(query)
      res.json(data)
    } catch (e) { next(e) }
  },

  async sync(req: Request, res: Response, next: NextFunction) {
    try {
      const body    = syncBodySchema.parse(req.body ?? {})
      const results = body.ticker
        ? [await syncDividendsForTicker(body.ticker.toUpperCase())]
        : await syncAllDividends()

      const totalUpdated = results.reduce((s, r) => s + r.updated, 0)
      const totalMissing = results.reduce((s, r) => s + r.notFound, 0)

      res.json({ ok: true, totalUpdated, totalMissing, details: results })
    } catch (e) { next(e) }
  },
}
