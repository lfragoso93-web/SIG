import { IncomeType } from '@prisma/client'
import { prisma } from '../../core/prisma/prisma.service'
import type { z } from 'zod'
import type {
  createIncomeEventSchema,
  updateIncomeEventSchema,
} from './income-events.schema'
import { brapiClient } from '../../providers/brapi/brapi.client'

type CreateIncomeEventInput = z.infer<typeof createIncomeEventSchema>
type UpdateIncomeEventInput = z.infer<typeof updateIncomeEventSchema>

export const findAllIncomeEvents = async () => {
  return prisma.incomeEvent.findMany({
    include: { asset: { select: { ticker: true, name: true } } },
    orderBy: { paymentDate: 'desc' },
  })
}

export const findIncomeEventById = async (id: string) => {
  return prisma.incomeEvent.findUnique({
    where: { id },
    include: { asset: { select: { ticker: true, name: true } } },
  })
}

export const createIncomeEvent = async (data: CreateIncomeEventInput) => {
  return prisma.incomeEvent.create({ data })
}

export const updateIncomeEvent = async (
  id: string,
  data: UpdateIncomeEventInput,
) => {
  return prisma.incomeEvent.update({ where: { id }, data })
}

export const deleteIncomeEvent = async (id: string) => {
  return prisma.incomeEvent.delete({ where: { id } })
}

export const importIncomeEventsFromBrapi = async (ticker: string) => {
  const asset = await prisma.asset.findFirst({ where: { ticker } })
  if (!asset) {
    throw new Error(`Ativo com ticker "${ticker}" não encontrado.`)
  }

  const dividends = await brapiClient.getDividends(ticker)

  if (dividends.length === 0) {
    return { ticker, inserted: 0, skipped: 0, total: 0 }
  }

  const records = dividends.map((d) => ({
    assetId:       asset.id,
    type:          resolveIncomeType(d.label ?? '') as IncomeType,
    status:        'CONFIRMED' as const,
    exDate:        d.lastDatePrior ? new Date(d.lastDatePrior) : null,
    paymentDate:   d.paymentDate   ? new Date(d.paymentDate)   : null,
    amountPerUnit: String(d.rate),
    grossAmount:   null,
    currencyCode:  'BRL',
    importedFrom:  'brapi',
    externalId:    `${ticker}_${d.lastDatePrior}_${d.rate}`,
    description:   d.label ?? null,
  }))

  const result = await prisma.incomeEvent.createMany({
    data: records,
    skipDuplicates: true,
  })

  return {
    ticker,
    inserted: result.count,
    skipped:  records.length - result.count,
    total:    records.length,
  }
}

export const importIncomeEventsBatch = async (tickers?: string[]) => {
  const assets =
    tickers && tickers.length > 0
      ? await prisma.asset.findMany({
          where:   { ticker: { in: tickers }, isActive: true },
          select:  { ticker: true },
          orderBy: { ticker: 'asc' },
        })
      : await prisma.asset.findMany({
          where:   { isActive: true },
          select:  { ticker: true },
          orderBy: { ticker: 'asc' },
        })

  const results: {
    ticker: string
    inserted: number
    skipped: number
    total: number
    error?: string
  }[] = []

  for (const asset of assets) {
    try {
      const result = await importIncomeEventsFromBrapi(asset.ticker)
      results.push(result)
    } catch (err) {
      results.push({
        ticker:   asset.ticker,
        inserted: 0,
        skipped:  0,
        total:    0,
        error:    (err as Error).message,
      })
    }
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

function resolveIncomeType(label: string): string {
  const l = label.toUpperCase()
  if (l.includes('JCP') || l.includes('JUROS'))             return 'JCP'
  if (l.includes('FII') || l.includes('RENDIMENTO'))        return 'FII_INCOME'
  if (l.includes('COUPON') || l.includes('CUPON'))          return 'COUPON'
  if (l.includes('AMORT'))                                   return 'AMORTIZATION'
  if (l.includes('SUBSCRI') || l.includes('DIREITO'))       return 'SUBSCRIPTION_RIGHT'
  return 'DIVIDEND'
}
