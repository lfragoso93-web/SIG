import { Prisma } from '@prisma/client'
import { prisma } from '../../core/prisma/prisma.service'
import { NotFoundError } from '../../shared/errors/AppError'
import { calcPositionFromTxs } from './portfolio-items.calc'

function toNum(val: unknown): number {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') return val
  return parseFloat(String(val))
}

async function upsertPortfolioItem(
  assetId:      string,
  accountId:    string | null,
  marketPrice:  number | null,
  transactions: { type: string; quantity: unknown; unitPrice: unknown }[],
) {
  const { quantity, totalCost, realizedPnL } = calcPositionFromTxs(
    transactions.map((tx) => ({
      type:      tx.type,
      quantity:  tx.quantity as string | number,
      unitPrice: tx.unitPrice as string | number,
    })),
  )

  const averagePrice   = quantity > 0 ? totalCost / quantity : 0
  const investedAmount = quantity * averagePrice
  const marketValue    = marketPrice !== null ? quantity * marketPrice : investedAmount
  const unrealizedPnL  = marketPrice !== null ? marketValue - investedAmount : 0

  const data = {
    quantity:       new Prisma.Decimal(quantity.toFixed(8)),
    averagePrice:   new Prisma.Decimal(averagePrice.toFixed(8)),
    investedAmount: new Prisma.Decimal(investedAmount.toFixed(2)),
    marketPrice:    marketPrice !== null ? new Prisma.Decimal(marketPrice.toFixed(8)) : null,
    marketValue:    new Prisma.Decimal(marketValue.toFixed(2)),
    unrealizedPnL:  new Prisma.Decimal(unrealizedPnL.toFixed(2)),
    realizedPnL:    new Prisma.Decimal(realizedPnL.toFixed(2)),
    lastUpdatedAt:  new Date(),
  }

  const existing = await prisma.portfolioItem.findFirst({
    where: { assetId, accountId: accountId ?? null },
  })

  if (existing) {
    return prisma.portfolioItem.update({
      where:   { id: existing.id },
      data,
      include: { asset: { include: { assetClass: true } }, account: true },
    })
  }

  return prisma.portfolioItem.create({
    data:    { assetId, accountId: accountId ?? null, ...data },
    include: { asset: { include: { assetClass: true } }, account: true },
  })
}

export async function recalculatePortfolioItem(ticker: string) {
  const asset = await prisma.asset.findUnique({ where: { ticker: ticker.toUpperCase() } })
  if (!asset) throw new NotFoundError('Ativo')

  const lastPrice = await prisma.priceHistory.findFirst({
    where:   { assetId: asset.id },
    orderBy: { priceDate: 'desc' },
  })
  const marketPrice = lastPrice ? toNum(lastPrice.closePrice) : null

  const allTxs = await prisma.transaction.findMany({
    where:   { assetId: asset.id, status: 'POSTED' },
    orderBy: { tradeDate: 'asc' },
  })

  // Agrupa por conta (null = posição consolidada)
  const byAccount = new Map<string | null, typeof allTxs>()
  for (const tx of allTxs) {
    const key = tx.accountId ?? null
    if (!byAccount.has(key)) byAccount.set(key, [])
    byAccount.get(key)!.push(tx)
  }

  const items = []
  for (const [accountId, txs] of byAccount) {
    const item = await upsertPortfolioItem(asset.id, accountId, marketPrice, txs)
    items.push({
      ticker,
      accountId,
      accountName:    item.account?.name ?? null,
      quantity:       toNum(item.quantity),
      averagePrice:   toNum(item.averagePrice),
      investedAmount: toNum(item.investedAmount),
      marketPrice:    item.marketPrice ? toNum(item.marketPrice) : null,
      marketValue:    toNum(item.marketValue),
      unrealizedPnL:  toNum(item.unrealizedPnL),
      realizedPnL:    toNum(item.realizedPnL),
      assetClass:     item.asset.assetClass.code,
      lastUpdatedAt:  item.lastUpdatedAt,
    })
  }

  return { ticker, accounts: items.length, items }
}

export async function recalculateAllPortfolioItems() {
  const assets = await prisma.asset.findMany({
    where:  { transactions: { some: { status: 'POSTED' } } },
    select: { ticker: true },
  })

  const results: object[] = []
  const errors:  object[] = []

  for (const asset of assets) {
    try {
      results.push(await recalculatePortfolioItem(asset.ticker))
    } catch (err) {
      errors.push({ ticker: asset.ticker, error: (err as Error).message })
    }
  }

  return { recalculated: results.length, errors, items: results }
}

export async function listPortfolioItems() {
  const items = await prisma.portfolioItem.findMany({
    where:   { quantity: { gt: 0 } },
    include: { asset: { include: { assetClass: true } }, account: true },
    orderBy: [
      { asset: { assetClass: { displayOrder: 'asc' } } },
      { asset: { ticker: 'asc' } },
    ],
  })

  return items.map((item) => ({
    ticker:         item.asset.ticker,
    name:           item.asset.name,
    assetClass:     item.asset.assetClass.code,
    accountId:      item.accountId  ?? null,
    accountName:    item.account?.name ?? null,
    quantity:       toNum(item.quantity),
    averagePrice:   toNum(item.averagePrice),
    investedAmount: toNum(item.investedAmount),
    marketPrice:    item.marketPrice ? toNum(item.marketPrice) : null,
    marketValue:    toNum(item.marketValue),
    unrealizedPnL:  toNum(item.unrealizedPnL),
    realizedPnL:    toNum(item.realizedPnL),
    lastUpdatedAt:  item.lastUpdatedAt,
  }))
}
