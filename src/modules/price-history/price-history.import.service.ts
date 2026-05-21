import { Prisma } from '@prisma/client'
import { prisma } from '../../core/prisma/prisma.service'
import {
  brapiClient,
  type BrapiHistoricalPriceRow,
  type BrapiInterval,
  type BrapiRange,
} from '../../providers/brapi/brapi.client'

interface ImportPriceHistoryInput {
  ticker:     string
  interval?:  BrapiInterval
  range?:     BrapiRange
  startDate?: string
  endDate?:   string
}

interface ImportPriceHistoryResult {
  assetId:   string
  ticker:    string
  requested: number
  inserted:  number
  skipped:   number
}

class PriceHistoryImportService {
  async importFromBrapi(
    input: ImportPriceHistoryInput,
  ): Promise<ImportPriceHistoryResult> {
    const ticker = input.ticker.trim().toUpperCase()

    this.validateInput(input)

    const asset = await prisma.asset.findUnique({
      where:  { ticker },
      select: { id: true, ticker: true, currencyCode: true },
    })

    if (!asset) {
      throw new Error(`Ativo ${ticker} não encontrado na base local.`)
    }

    const historicalRows = await brapiClient.getHistoricalPrices({
      ticker,
      interval:  input.interval ?? '1d',
      range:     input.range,
      startDate: input.startDate,
      endDate:   input.endDate,
    })

    const normalizedRows = this.normalizeRows(
      asset.id,
      asset.currencyCode,
      historicalRows,
    )

    if (!normalizedRows.length) {
      return { assetId: asset.id, ticker: asset.ticker, requested: 0, inserted: 0, skipped: 0 }
    }

    const createManyResult = await prisma.priceHistory.createMany({
      data:           normalizedRows,
      skipDuplicates: true,
    })

    const inserted  = createManyResult.count
    const requested = normalizedRows.length
    const skipped   = requested - inserted

    return { assetId: asset.id, ticker: asset.ticker, requested, inserted, skipped }
  }

  private validateInput(input: ImportPriceHistoryInput): void {
    const hasStartDate = !!input.startDate
    const hasEndDate   = !!input.endDate
    if (hasStartDate !== hasEndDate) {
      throw new Error('startDate e endDate devem ser informados juntos.')
    }
  }

  private normalizeRows(
    assetId:             string,
    fallbackCurrencyCode: string,
    rows:                BrapiHistoricalPriceRow[],
  ): Prisma.PriceHistoryCreateManyInput[] {
    const deduplicated = new Map<string, Prisma.PriceHistoryCreateManyInput>()

    for (const row of rows) {
      if (!row.date || row.close == null) continue

      const priceDate = new Date(`${row.date}T00:00:00.000Z`)
      if (Number.isNaN(priceDate.getTime())) continue

      deduplicated.set(row.date, {
        assetId,
        priceDate,
        openPrice:     this.toPrismaDecimal(row.open),
        highPrice:     this.toPrismaDecimal(row.high),
        lowPrice:      this.toPrismaDecimal(row.low),
        closePrice:    new Prisma.Decimal(row.close),
        adjustedClose: this.toPrismaDecimal(row.adjustedClose),
        currencyCode:  row.currencyCode ?? fallbackCurrencyCode ?? 'BRL',
        source:        'BRAPI',
      })
    }

    return Array.from(deduplicated.values())
  }

  private toPrismaDecimal(value: number | null): Prisma.Decimal | null {
    return value == null ? null : new Prisma.Decimal(value)
  }
}

export default new PriceHistoryImportService()
