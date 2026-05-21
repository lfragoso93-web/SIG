import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma/prisma.service';

const BUY_TYPES = ['BUY', 'BONUS', 'SPLIT'];
const SELL_TYPES = ['SELL', 'REVERSE_SPLIT'];

function toNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  return parseFloat(String(val));
}

export async function recalculatePortfolioItem(ticker: string) {
  const asset = await prisma.asset.findUnique({ where: { ticker } });

  if (!asset) {
    throw new Error(`Ativo não encontrado: ${ticker}`);
  }

  const transactions = await prisma.transaction.findMany({
    where: { assetId: asset.id, status: 'POSTED' },
    orderBy: { tradeDate: 'asc' },
  });

  let quantity = 0;
  let totalCost = 0;
  let realizedPnL = 0;

  for (const tx of transactions) {
    const qty = toNum(tx.quantity);
    const price = toNum(tx.unitPrice);

    if (BUY_TYPES.includes(tx.type)) {
      totalCost += qty * price;
      quantity += qty;
    } else if (SELL_TYPES.includes(tx.type)) {
      if (quantity > 0) {
        const avgPrice = totalCost / quantity;
        const costOfSold = qty * avgPrice;
        const saleValue = qty * price;
        realizedPnL += saleValue - costOfSold;
        totalCost -= costOfSold;
        quantity -= qty;
        if (quantity <= 0) {
          quantity = 0;
          totalCost = 0;
        }
      }
    }
  }

  const averagePrice = quantity > 0 ? totalCost / quantity : 0;
  const investedAmount = quantity * averagePrice;

  const lastPrice = await prisma.priceHistory.findFirst({
    where: { assetId: asset.id },
    orderBy: { priceDate: 'desc' },
  });

  const marketPrice = lastPrice ? toNum(lastPrice.closePrice) : null;
  const marketValue = marketPrice ? quantity * marketPrice : 0;
  const unrealizedPnL = marketPrice ? marketValue - investedAmount : 0;

  // Busca o portfolioItem consolidado para este ativo (sem filtro de conta)
  const existing = await prisma.portfolioItem.findFirst({
    where: { assetId: asset.id },
  });

  const data = {
    quantity:       new Prisma.Decimal(quantity),
    averagePrice:   new Prisma.Decimal(averagePrice),
    investedAmount: new Prisma.Decimal(investedAmount),
    marketPrice:    marketPrice !== null ? new Prisma.Decimal(marketPrice) : null,
    marketValue:    new Prisma.Decimal(marketValue),
    unrealizedPnL:  new Prisma.Decimal(unrealizedPnL),
    realizedPnL:    new Prisma.Decimal(realizedPnL),
    lastUpdatedAt:  new Date(),
  };

  let item;
  if (existing) {
    item = await prisma.portfolioItem.update({
      where: { id: existing.id },
      data,
      include: { asset: { include: { assetClass: true } } },
    });
  } else {
    item = await prisma.portfolioItem.create({
      data: { assetId: asset.id, ...data },
      include: { asset: { include: { assetClass: true } } },
    });
  }

  return {
    ticker,
    quantity:       toNum(item.quantity),
    averagePrice:   toNum(item.averagePrice),
    investedAmount: toNum(item.investedAmount),
    marketPrice:    item.marketPrice ? toNum(item.marketPrice) : null,
    marketValue:    toNum(item.marketValue),
    unrealizedPnL:  toNum(item.unrealizedPnL),
    realizedPnL:    toNum(item.realizedPnL),
    assetClass:     item.asset.assetClass.code,
    lastUpdatedAt:  item.lastUpdatedAt,
  };
}

export async function recalculateAllPortfolioItems() {
  const assets = await prisma.asset.findMany({
    where: { transactions: { some: { status: 'POSTED' } } },
    select: { ticker: true },
  });

  const results: object[] = [];
  const errors: object[] = [];

  for (const asset of assets) {
    try {
      const result = await recalculatePortfolioItem(asset.ticker);
      results.push(result);
    } catch (err) {
      errors.push({ ticker: asset.ticker, error: (err as Error).message });
    }
  }

  return { recalculated: results.length, errors, items: results };
}

export async function listPortfolioItems() {
  const items = await prisma.portfolioItem.findMany({
    where: { quantity: { gt: 0 } },
    include: { asset: { include: { assetClass: true } } },
    orderBy: [
      { asset: { assetClass: { displayOrder: 'asc' } } },
      { asset: { ticker: 'asc' } },
    ],
  });

  return items.map((item) => ({
    ticker:         item.asset.ticker,
    name:           item.asset.name,
    assetClass:     item.asset.assetClass.code,
    quantity:       toNum(item.quantity),
    averagePrice:   toNum(item.averagePrice),
    investedAmount: toNum(item.investedAmount),
    marketPrice:    item.marketPrice ? toNum(item.marketPrice) : null,
    marketValue:    toNum(item.marketValue),
    unrealizedPnL:  toNum(item.unrealizedPnL),
    realizedPnL:    toNum(item.realizedPnL),
    lastUpdatedAt:  item.lastUpdatedAt,
  }));
}
