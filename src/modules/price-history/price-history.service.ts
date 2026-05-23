import { Prisma } from '@prisma/client'
import { prisma } from '../../core/prisma/prisma.service'
import { fetchPriceHistory } from '../../providers/yahoo/yahoo-finance.client'
import type { ImportPriceHistoryBody } from './price-history.schema'

interface ImportPriceHistoryInput extends ImportPriceHistoryBody {
  ticker: string
}

interface ImportPriceHistoryResult {
  ticker:   string
  inserted: number
  skipped:  number
  total:    number
  error?:   string
}

class PriceHistoryService {
  async importFromYahoo(input: ImportPriceHistoryInput): Promise<ImportPriceHistoryResult> {
    const { ticker, startDate, endDate } = input

    const asset = await prisma.asset.findUnique({
      where:  { ticker },
      select: { id: true, ticker: true },
    })

    if (!asset) {
      throw new Error(`Ativo com ticker "${ticker}" não encontrado no banco de dados.`)
    }

    const rows = await fetchPriceHistory({ ticker, startDate, endDate })

    if (rows.length === 0) {
      return { ticker, inserted: 0, skipped: 0, total: 0 }
    }

    const payload: Prisma.PriceHistoryCreateManyInput[] = rows.map((row) => ({
      assetId:       asset.id,
      priceDate:     new Date(`${row.date}T00:00:00.000Z`),
      openPrice:     row.open          !== null ? new Prisma.Decimal(row.open)          : null,
      highPrice:     row.high          !== null ? new Prisma.Decimal(row.high)          : null,
      lowPrice:      row.low           !== null ? new Prisma.Decimal(row.low)           : null,
      closePrice:    new Prisma.Decimal(row.close),
      adjustedClose: row.adjustedClose !== null ? new Prisma.Decimal(row.adjustedClose) : null,
      currencyCode:  row.currencyCode,
      source:        'YAHOO',
    }))

    const result = await prisma.priceHistory.createMany({
      data:           payload,
      skipDuplicates: true,
    })

    return {
      ticker,
      inserted: result.count,
      skipped:  rows.length - result.count,
      total:    rows.length,
    }
  }

  async importBatch(
    tickers: string[],
    options: Omit<ImportPriceHistoryBody, 'ticker'>,
  ): Promise<{
    results: ImportPriceHistoryResult[]
    summary: { total: number; inserted: number; skipped: number; errors: number }
  }> {
    const results: ImportPriceHistoryResult[] = []

    for (const ticker of tickers) {
      try {
        results.push(await this.importFromYahoo({ ticker, ...options }))
      } catch (err) {
        results.push({ ticker, inserted: 0, skipped: 0, total: 0, error: (err as Error).message })
      }
      // Pausa entre requests para não ser rate-limited pelo Yahoo
      await new Promise((r) => setTimeout(r, 400))
    }

    const summary = results.reduce(
      (acc, r) => ({
        total:    acc.total    + r.total,
        inserted: acc.inserted + r.inserted,
        skipped:  acc.skipped  + r.skipped,
        errors:   acc.errors   + (r.error ? 1 : 0),
      }),
      { total: 0, inserted: 0, skipped: 0, errors: 0 },
    )

    return { results, summary }
  }

  async importAllAssets(options: Omit<ImportPriceHistoryBody, 'ticker'>) {
    const assets = await prisma.asset.findMany({
      where:   { isActive: true },
      select:  { ticker: true },
      orderBy: { ticker: 'asc' },
    })
    return this.importBatch(assets.map((a) => a.ticker), options)
  }
}

export const priceHistoryService = new PriceHistoryService()
