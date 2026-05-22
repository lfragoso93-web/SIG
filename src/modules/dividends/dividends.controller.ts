import { FastifyRequest, FastifyReply } from 'fastify'
import { dividendsService } from './dividends.service'
import { syncAllDividends, syncDividendsForTicker } from './dividends.sync.service'
import { DividendsSummaryQueryInput } from './dividends.schema'
import { z } from 'zod'

const syncBodySchema = z.object({
  ticker: z.string().optional(),
})

export const dividendsController = {
  async getSummary(req: FastifyRequest, reply: FastifyReply) {
    const query = req.query as DividendsSummaryQueryInput
    const data  = await dividendsService.getSummary(query)
    return reply.send(data)
  },

  async sync(req: FastifyRequest, reply: FastifyReply) {
    const body   = syncBodySchema.parse(req.body ?? {})
    const results = body.ticker
      ? [await syncDividendsForTicker(body.ticker.toUpperCase())]
      : await syncAllDividends()

    const totalUpdated = results.reduce((s, r) => s + r.updated, 0)
    const totalMissing = results.reduce((s, r) => s + r.notFound, 0)

    return reply.send({
      ok:           true,
      totalUpdated,
      totalMissing,
      details:      results,
    })
  },
}
