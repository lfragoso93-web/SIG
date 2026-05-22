import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma/prisma.service';

// ─── helpers ────────────────────────────────────────────────────────────────

function toNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  return parseFloat(String(val));
}

/** Retorna a sexta-feira da semana de uma data qualquer. */
function toFriday(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0=dom … 5=sex … 6=sab
  const diff = day <= 5 ? 5 - day : 5 - day + 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

/** Gera todas as sextas-feiras entre start e end (inclusive). */
function fridaysBetween(start: Date, end: Date): Date[] {
  const fridays: Date[] = [];
  let current = toFriday(start);
  const limit = toFriday(end);
  while (current <= limit) {
    fridays.push(new Date(current));
    current = new Date(current);
    current.setUTCDate(current.getUTCDate() + 7);
  }
  return fridays;
}

// ─── cálculo de posição até uma data ─────────────────────────────────────────

const BUY_TYPES  = ['BUY', 'BONUS', 'SPLIT'];
const SELL_TYPES = ['SELL', 'REVERSE_SPLIT'];

function calcPosition(txs: { type: string; quantity: unknown; unitPrice: unknown }[]) {
  let quantity = 0, totalCost = 0, realizedPnL = 0;
  for (const tx of txs) {
    const qty   = toNum(tx.quantity);
    const price = toNum(tx.unitPrice);
    if (BUY_TYPES.includes(tx.type)) {
      quantity  += qty;
      totalCost += qty * price;
    } else if (SELL_TYPES.includes(tx.type) && quantity > 0) {
      const avg    = totalCost / quantity;
      realizedPnL += qty * price - qty * avg;
      totalCost   -= qty * avg;
      quantity    -= qty;
      if (quantity <= 0) { quantity = 0; totalCost = 0; }
    }
  }
  return { quantity, totalCost, realizedPnL };
}

// ─── geração de snapshot ────────────────────────────────────────────────────

export async function generateSnapshot(referenceDate: Date) {
  const friday = toFriday(referenceDate);
  const fridayEnd = new Date(friday);
  fridayEnd.setUTCHours(23, 59, 59, 999);

  // Busca todas as classes ativas para preservar targetPercentage mesmo
  // quando alguma classe ainda não tem posição nessa data.
  const assetClasses = await prisma.assetClass.findMany({
    where:   { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });

  // Todos os ativos com transações até essa sexta
  const assets = await prisma.asset.findMany({
    where: {
      isActive: true,
      transactions: { some: { status: 'POSTED', tradeDate: { lte: fridayEnd } } },
    },
    include: { assetClass: true },
  });

  let totalInvested    = 0;
  let totalMarketValue = 0;
  let totalIncome      = 0;

  const assetSnapshots: Prisma.PortfolioAssetSnapshotCreateManySnapshotInput[] = [];

  // Inicializa byClass com TODAS as classes ativas, já com a meta gravada
  const byClass = new Map<string, {
    assetClassId:     string;
    invested:         number;
    marketValue:      number;
    targetPercentage: number | null;
  }>();

  for (const ac of assetClasses) {
    byClass.set(ac.id, {
      assetClassId:     ac.id,
      invested:         0,
      marketValue:      0,
      targetPercentage: ac.targetPercentage !== null && ac.targetPercentage !== undefined
        ? toNum(ac.targetPercentage)
        : null,
    });
  }

  for (const asset of assets) {
    const txs = await prisma.transaction.findMany({
      where:   { assetId: asset.id, status: 'POSTED', tradeDate: { lte: fridayEnd } },
      orderBy: { tradeDate: 'asc' },
    });

    const { quantity, totalCost } = calcPosition(txs);
    if (quantity <= 0) continue;

    const averagePrice   = totalCost / quantity;
    const investedAmount = quantity * averagePrice;

    const priceRow = await prisma.priceHistory.findFirst({
      where:   { assetId: asset.id, priceDate: { lte: fridayEnd } },
      orderBy: { priceDate: 'desc' },
    });
    const marketPrice = priceRow ? toNum(priceRow.closePrice) : null;
    const marketValue = marketPrice !== null ? quantity * marketPrice : investedAmount;
    const profitLoss  = marketValue - investedAmount;

    const incomeAgg = await prisma.incomeEvent.aggregate({
      where: { assetId: asset.id, status: { in: ['CONFIRMED', 'PAID'] }, paymentDate: { lte: fridayEnd } },
      _sum:  { netAmount: true, grossAmount: true },
    });
    const incomeReceived = toNum(incomeAgg._sum.netAmount ?? incomeAgg._sum.grossAmount);

    totalInvested    += investedAmount;
    totalMarketValue += marketValue;
    totalIncome      += incomeReceived;

    assetSnapshots.push({
      assetId:        asset.id,
      accountId:      null,
      quantity:       new Prisma.Decimal(quantity),
      averagePrice:   new Prisma.Decimal(averagePrice),
      marketPrice:    marketPrice !== null ? new Prisma.Decimal(marketPrice) : null,
      investedAmount: new Prisma.Decimal(investedAmount),
      marketValue:    new Prisma.Decimal(marketValue),
      profitLoss:     new Prisma.Decimal(profitLoss),
      profitLossPct:  investedAmount > 0 ? new Prisma.Decimal(profitLoss / investedAmount) : null,
      incomeReceived: new Prisma.Decimal(incomeReceived),
    });

    // Agrega por classe
    const cls = byClass.get(asset.assetClassId) ?? {
      assetClassId:     asset.assetClassId,
      invested:         0,
      marketValue:      0,
      targetPercentage: null,
    };
    cls.invested    += investedAmount;
    cls.marketValue += marketValue;
    byClass.set(asset.assetClassId, cls);
  }

  const totalProfitLoss    = totalMarketValue - totalInvested;
  const totalProfitLossPct = totalInvested > 0 ? totalProfitLoss / totalInvested : 0;

  const classSnapshots: Prisma.PortfolioClassSnapshotCreateManySnapshotInput[] = [
    ...byClass.values(),
  ].map((cls) => {
    const currentPct = totalMarketValue > 0 ? cls.marketValue / totalMarketValue : 0;
    const targetPct  = cls.targetPercentage;

    // rebalanceDifference: quanto falta (positivo) ou sobra (negativo) em R$ para atingir a meta
    const rebalanceDifference = targetPct !== null
      ? new Prisma.Decimal((targetPct - currentPct) * totalMarketValue)
      : null;

    return {
      assetClassId:          cls.assetClassId,
      investedAmount:        new Prisma.Decimal(cls.invested),
      marketValue:           new Prisma.Decimal(cls.marketValue),
      profitLoss:            new Prisma.Decimal(cls.marketValue - cls.invested),
      currentPercentage:     new Prisma.Decimal(currentPct),
      targetPercentage:      targetPct !== null ? new Prisma.Decimal(targetPct) : null,
      rebalanceDifference,
      // suggestedContribution: preenchida pelo módulo de performance com o aporte mensal informado
      suggestedContribution: null,
    };
  });

  const snapshot = await prisma.portfolioSnapshot.upsert({
    where:  { referenceDate_period: { referenceDate: friday, period: 'WEEKLY' } },
    update: {
      totalInvested:      new Prisma.Decimal(totalInvested),
      totalMarketValue:   new Prisma.Decimal(totalMarketValue),
      totalProfitLoss:    new Prisma.Decimal(totalProfitLoss),
      totalProfitLossPct: new Prisma.Decimal(totalProfitLossPct),
      totalIncome:        new Prisma.Decimal(totalIncome),
      assetSnapshots: { deleteMany: {}, createMany: { data: assetSnapshots } },
      classSnapshots: { deleteMany: {}, createMany: { data: classSnapshots } },
    },
    create: {
      referenceDate:      friday,
      period:             'WEEKLY',
      totalInvested:      new Prisma.Decimal(totalInvested),
      totalMarketValue:   new Prisma.Decimal(totalMarketValue),
      totalProfitLoss:    new Prisma.Decimal(totalProfitLoss),
      totalProfitLossPct: new Prisma.Decimal(totalProfitLossPct),
      totalIncome:        new Prisma.Decimal(totalIncome),
      assetSnapshots: { createMany: { data: assetSnapshots } },
      classSnapshots: { createMany: { data: classSnapshots } },
    },
    include: {
      assetSnapshots: { include: { asset: { select: { ticker: true } } } },
      classSnapshots: { include: { assetClass: { select: { code: true, name: true } } } },
    },
  });

  return formatSnapshot(snapshot);
}

export async function generateSnapshotRange(startDate: Date, endDate: Date) {
  const fridays = fridaysBetween(startDate, endDate);
  const results: object[] = [];
  const errors:  object[] = [];

  for (const friday of fridays) {
    try {
      results.push(await generateSnapshot(friday));
    } catch (err) {
      errors.push({ date: friday.toISOString().slice(0, 10), error: (err as Error).message });
    }
  }

  return { generated: results.length, errors, snapshots: results };
}

export async function listSnapshots(from?: Date, to?: Date) {
  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: {
      period: 'WEEKLY',
      ...(from || to ? {
        referenceDate: {
          ...(from ? { gte: from } : {}),
          ...(to   ? { lte: to   } : {}),
        },
      } : {}),
    },
    orderBy: { referenceDate: 'desc' },
    include: {
      assetSnapshots: { include: { asset: { select: { ticker: true } } } },
      classSnapshots: { include: { assetClass: { select: { code: true, name: true } } } },
    },
  });

  return snapshots.map(formatSnapshot);
}

export async function getSnapshotByDate(referenceDate: Date) {
  const friday = toFriday(referenceDate);
  const snapshot = await prisma.portfolioSnapshot.findUnique({
    where: { referenceDate_period: { referenceDate: friday, period: 'WEEKLY' } },
    include: {
      assetSnapshots: { include: { asset: { select: { ticker: true } } } },
      classSnapshots: { include: { assetClass: { select: { code: true, name: true } } } },
    },
  });
  return snapshot ? formatSnapshot(snapshot) : null;
}

// ─── formatter ──────────────────────────────────────────────────────────────

function formatSnapshot(s: any) {
  return {
    referenceDate:      s.referenceDate,
    period:             s.period,
    totalInvested:      toNum(s.totalInvested),
    totalMarketValue:   toNum(s.totalMarketValue),
    totalProfitLoss:    toNum(s.totalProfitLoss),
    totalProfitLossPct: toNum(s.totalProfitLossPct),
    totalIncome:        toNum(s.totalIncome),
    byAsset: s.assetSnapshots.map((a: any) => ({
      ticker:         a.asset.ticker,
      quantity:       toNum(a.quantity),
      averagePrice:   toNum(a.averagePrice),
      marketPrice:    a.marketPrice ? toNum(a.marketPrice) : null,
      investedAmount: toNum(a.investedAmount),
      marketValue:    toNum(a.marketValue),
      profitLoss:     toNum(a.profitLoss),
      profitLossPct:  toNum(a.profitLossPct),
      incomeReceived: toNum(a.incomeReceived),
    })),
    byClass: s.classSnapshots.map((c: any) => ({
      assetClass:            c.assetClass.code,
      assetClassName:        c.assetClass.name,
      investedAmount:        toNum(c.investedAmount),
      marketValue:           toNum(c.marketValue),
      profitLoss:            toNum(c.profitLoss),
      currentPercentage:     toNum(c.currentPercentage),
      targetPercentage:      c.targetPercentage !== null && c.targetPercentage !== undefined
        ? toNum(c.targetPercentage) : null,
      rebalanceDifference:   c.rebalanceDifference !== null && c.rebalanceDifference !== undefined
        ? toNum(c.rebalanceDifference) : null,
      suggestedContribution: c.suggestedContribution !== null && c.suggestedContribution !== undefined
        ? toNum(c.suggestedContribution) : null,
    })),
  };
}
