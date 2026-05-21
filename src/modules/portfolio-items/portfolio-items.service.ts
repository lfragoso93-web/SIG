import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma/prisma.service';

const BUY_TYPES  = ['BUY', 'BONUS', 'SPLIT'];
const SELL_TYPES = ['SELL', 'REVERSE_SPLIT'];

// ID fictício que representa o portfolio consolidado (sem conta)
const CONSOLIDATED_ACCOUNT_ID = 'consolidated';

function toNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  return parseFloat(String(val));
}

function calcPositionFromTxs(
  transactions: { type: string; quantity: unknown; unitPrice: unknown }[],
): { quantity: number; totalCost: number; realizedPnL: number } {
  let quantity    = 0;
  let totalCost   = 0;
  let realizedPnL = 0;

  for (const tx of transactions) {
    const qty   = toNum(tx.quantity);
    const price = toNum(tx.unitPrice);

    if (BUY_TYPES.includes(tx.type)) {
      totalCost += qty * price;
      quantity  += qty;
    } else if (SELL_TYPES.includes(tx.type)) {
      if (quantity > 0) {
        const avgPrice   = totalCost / quantity;
        const costOfSold = qty * avgPrice;
        realizedPnL += qty * price - costOfSold;
        totalCost   -= costOfSold;
        quantity    -= qty;
        if (quantity <= 0) { quantity = 0; totalCost = 0; }
      }
    }
  }

  return { quantity, totalCost, realizedPnL };
}

async function upsertPortfolioItem(
  assetId: string,
  accountId: string,
  marketPrice: number | null,
  transactions: { type: string; quantity: unknown; unitPrice: unknown }[],
) {
  const { quantity, totalCost, realizedPnL } = calcPositionFromTxs(transactions);
  const averagePrice   = quantity > 0 ? totalCost / quantity : 0;
  const investedAmount = quantity * averagePrice;
  const marketValue    = marketPrice !== null ? quantity * marketPrice : 0;
  const unrealizedPnL  = marketPrice !== null ? marketValue - investedAmount : 0;

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

  const existing = await prisma.portfolioItem.findUnique({
    where: { assetId_accountId: { assetId, accountId } },
  });

  if (existing) {
    return prisma.portfolioItem.update({
      where:   { id: existing.id },
      data,
      include: { asset: { include: { assetClass: true } } },
    });
  }

  return prisma.portfolioItem.create({
    data:    { assetId, accountId, ...data },
    include: { asset: { include: { assetClass: true } } },
  });
}

export async function recalculatePortfolioItem(ticker: string) {
  const asset = await prisma.asset.findUnique({ where: { ticker } });
  if (!asset) throw new Error(`Ativo não encontrado: ${ticker}`);

  const lastPrice = await prisma.priceHistory.findFirst({
    where:   { assetId: asset.id },
    orderBy: { priceDate: 'desc' },
  });
  const marketPrice = lastPrice ? toNum(lastPrice.closePrice) : null;

  const allTxs = await prisma.transaction.findMany({
    where:   { assetId: asset.id, status: 'POSTED' },
    orderBy: { tradeDate: 'asc' },
  });

  // Agrupa transações por conta (null vira CONSOLIDATED_ACCOUNT_ID)
  const byAccount = new Map<string, typeof allTxs>();
  for (const tx of allTxs) {
    const key = tx.accountId ?? CONSOLIDATED_ACCOUNT_ID;
    if (!byAccount.has(key)) byAccount.set(key, []);
    byAccount.get(key)!.push(tx);
  }

  const items = [];

  for (const [accountId, txs] of byAccount) {
    const item = await upsertPortfolioItem(asset.id, accountId, marketPrice, txs);
    items.push({
      ticker,
      accountId: accountId === CONSOLIDATED_ACCOUNT_ID ? null : accountId,
      quantity:       toNum(item.quantity),
      averagePrice:   toNum(item.averagePrice),
      investedAmount: toNum(item.investedAmount),
      marketPrice:    item.marketPrice ? toNum(item.marketPrice) : null,
      marketValue:    toNum(item.marketValue),
      unrealizedPnL:  toNum(item.unrealizedPnL),
      realizedPnL:    toNum(item.realizedPnL),
      assetClass:     item.asset.assetClass.code,
      lastUpdatedAt:  item.lastUpdatedAt,
    });
  }

  return { ticker, accounts: items.length, items };
}

export async function recalculateAllPortfolioItems() {
  const assets = await prisma.asset.findMany({
    where:  { transactions: { some: { status: 'POSTED' } } },
    select: { ticker: true },
  });

  const results: object[] = [];
  const errors:  object[] = [];

  for (const asset of assets) {
    try {
      results.push(await recalculatePortfolioItem(asset.ticker));
    } catch (err) {
      errors.push({ ticker: asset.ticker, error: (err as Error).message });
    }
  }

  return { recalculated: results.length, errors, items: results };
}

export async function listPortfolioItems() {
  const items = await prisma.portfolioItem.findMany({
    where:   { quantity: { gt: 0 } },
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
    accountId:      item.accountId === CONSOLIDATED_ACCOUNT_ID ? null : item.accountId,
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
