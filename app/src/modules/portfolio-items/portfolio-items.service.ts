import { Decimal } from '@prisma/client/runtime/library';
import { getPrismaClient } from '../../core/prisma/prisma.service';

const prisma = getPrismaClient();

// Tipos de transação que aumentam a posição
const BUY_TYPES = ['BUY', 'BONUS', 'SPLIT'];
// Tipos de transação que diminuem a posição
const SELL_TYPES = ['SELL', 'REVERSE_SPLIT'];

/**
 * Recalcula o PortfolioItem de um ativo específico a partir de suas transações.
 * Usa custo médio ponderado para averagePrice.
 * Upsert: cria se não existir, atualiza se já existir.
 */
export async function recalculatePortfolioItem(ticker: string) {
  const asset = await prisma.asset.findUnique({
    where: { ticker },
  });

  if (!asset) {
    throw new Error(`Ativo não encontrado: ${ticker}`);
  }

  // Busca todas as transações do ativo, ordenadas por data
  const transactions = await prisma.transaction.findMany({
    where: {
      assetId: asset.id,
      status: 'POSTED',
    },
    orderBy: { tradeDate: 'asc' },
  });

  // Calcula posição via custo médio ponderado
  let quantity = new Decimal(0);
  let totalCost = new Decimal(0); // custo total acumulado (para calcular preço médio)
  let realizedPnL = new Decimal(0);

  for (const tx of transactions) {
    const qty = tx.quantity ?? new Decimal(0);
    const price = tx.unitPrice ?? new Decimal(0);

    if (BUY_TYPES.includes(tx.type)) {
      // Compra: aumenta posição e custo total
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
        // Garante que não fique negativo por arredondamento
        if (quantity.lte(0)) {
          quantity = new Decimal(0);
          totalCost = new Decimal(0);
        }
      }
    }
  }

  const averagePrice = quantity.gt(0) ? totalCost.div(quantity) : new Decimal(0);
  const investedAmount = quantity.mul(averagePrice);

  // Busca último preço de fechamento disponível
  const lastPrice = await prisma.priceHistory.findFirst({
    where: { assetId: asset.id },
    orderBy: { priceDate: 'desc' },
  });

  const marketPrice = lastPrice?.closePrice ?? null;
  const marketValue = marketPrice ? quantity.mul(marketPrice) : new Decimal(0);
  const unrealizedPnL = marketPrice ? marketValue.sub(investedAmount) : new Decimal(0);

  // Upsert do PortfolioItem (sem accountId pois a carteira é orientada ao ativo)
  // A constraint única é [assetId, accountId] — usamos accountId=null aqui
  // Como o Prisma não suporta upsert com null em compound unique, usamos findFirst + upsert manual
  const existing = await prisma.portfolioItem.findFirst({
    where: {
      assetId: asset.id,
      accountId: null,
    },
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
      data: {
        assetId: asset.id,
        accountId: null,
        ...data,
      },
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

/**
 * Recalcula a posição de todos os ativos que possuem transações.
 */
export async function recalculateAllPortfolioItems() {
  // Busca tickers distintos com transações
  const assets = await prisma.asset.findMany({
    where: {
      transactions: {
        some: { status: 'POSTED' },
      },
    },
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

/**
 * Lista todos os PortfolioItems ativos (quantity > 0).
 */
export async function listPortfolioItems() {
  const items = await prisma.portfolioItem.findMany({
    where: {
      quantity: { gt: 0 },
    },
    include: {
      asset: {
        include: { assetClass: true },
      },
    },
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
