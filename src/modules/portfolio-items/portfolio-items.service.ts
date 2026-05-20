import { Decimal } from '@prisma/client/runtime/library';
import { getPrismaClient } from '../../core/prisma/prisma.service';

const prisma = getPrismaClient();

// Tipos de transação que aumentam a posição
const BUY_TYPES = ['BUY', 'BONUS', 'SPLIT'];
// Tipos de transação que diminuem a posição
const SELL_TYPES = ['SELL', 'REVERSE_SPLIT'];

export async function recalculatePortfolioItem(ticker: string) {
  const asset = await prisma.asset.findUnique({
    where: { ticker },
  });

  if (!asset) {
    throw new Error(`Ativo não encontrado: ${ticker}`);
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      assetId: asset.id,
      status: 'POSTED',
    },
    orderBy: { tradeDate: 'asc' },
  });

  let quantity = new Decimal(0);
  let totalCost = new Decimal(0);
  let realizedPnL = new Decimal(0);

  for (const tx of transactions) {
    const qty = tx.quantity ?? new Decimal(0);
    const price = tx.unitPrice ?? new Decimal(0);

    if (BUY_TYPES.includes(tx.type)) {
      const cost = qty.mul(price);
      totalCost = totalCost.add(cost);
      quantity = quantity.add(qty);
    } else if (SELL_TYPES.includes(tx.type)) {
      if (quantity.gt(0)) {
        const avgPrice = totalCost.div(quantity);
        const costOfSold = qty.mul(avgPrice);
        const saleValue = qty.mul(price);
        realizedPnL = realizedPnL.add(saleValue.sub(costOfSold));
        totalCost = totalCost.sub(costOfSold);
        quantity = quantity.sub(qty);
        if (quantity.lte(0)) {
          quantity = new Decimal(0);
          totalCost = new Decimal(0);
        }
      }
    }
  }

  const averagePrice = quantity.gt(0) ? totalCost.div(quantity) : new Decimal(0);
  const investedAmount = quantity.mul(averagePrice);

  const lastPrice = await prisma.priceHistory.findFirst({
    where: { assetId: asset.id },
    orderBy: { priceDate: 'desc' },
  });

  const marketPrice = lastPrice?.closePrice ?? null;
  const marketValue = marketPrice ? quantity.mul(marketPrice) : new Decimal(0);
  const unrealizedPnL = marketPrice ? marketValue.sub(investedAmount) : new Decimal(0);

  const existing = await prisma.portfolioItem.findFirst({
    where: { assetId: asset.id, accountId: null },
  });

  const data = {
    quantity,
    averagePrice,
    investedAmount,
    marketPrice,
    marketValue,
    unrealizedPnL,
    realizedPnL,
    lastUpdatedAt: new Date(),
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
      data: { assetId: asset.id, accountId: null, ...data },
      include: { asset: { include: { assetClass: true } } },
    });
  }

  return {
    ticker,
    quantity: item.quantity,
    averagePrice: item.averagePrice,
    investedAmount: item.investedAmount,
    marketPrice: item.marketPrice,
    marketValue: item.marketValue,
    unrealizedPnL: item.unrealizedPnL,
    realizedPnL: item.realizedPnL,
    assetClass: item.asset.assetClass.code,
    lastUpdatedAt: item.lastUpdatedAt,
  };
}

export async function recalculateAllPortfolioItems() {
  const assets = await prisma.asset.findMany({
    where: { transactions: { some: { status: 'POSTED' } } },
    select: { ticker: true },
  });

  const results = [];
  const errors = [];

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
    ticker: item.asset.ticker,
    name: item.asset.name,
    assetClass: item.asset.assetClass.code,
    quantity: item.quantity,
    averagePrice: item.averagePrice,
    investedAmount: item.investedAmount,
    marketPrice: item.marketPrice,
    marketValue: item.marketValue,
    unrealizedPnL: item.unrealizedPnL,
    realizedPnL: item.realizedPnL,
    lastUpdatedAt: item.lastUpdatedAt,
  }));
}
