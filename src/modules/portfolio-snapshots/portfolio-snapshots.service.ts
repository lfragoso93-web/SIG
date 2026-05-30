import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma/prisma.service';

function toNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  return parseFloat(String(val));
}

function toFriday(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = day <= 5 ? 5 - day : 5 - day + 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function toMidnightUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

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

function weekdaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = toMidnightUTC(start);
  const limit   = toMidnightUTC(end);
  while (current <= limit) {
    const dow = current.getUTCDay();
    if (dow >= 1 && dow <= 5) days.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

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

export type SnapshotPeriodType = 'DAILY' | 'WEEKLY';

export async function generateSnapshot(
  userId: string,
  referenceDate: Date,
  period: SnapshotPeriodType = 'WEEKLY',
) {
  const anchor    = period === 'WEEKLY' ? toFriday(referenceDate) : toMidnightUTC(referenceDate);
  const anchorEnd = new Date(anchor);
  anchorEnd.setUTCHours(23, 59, 59, 999);

  const assetClasses = await prisma.assetClass.findMany({
    where:   { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });

  const assets = await prisma.asset.findMany({
    where: {
      isActive: true,
      transactions: { some: { userId, status: 'POSTED', tradeDate: { lte: anchorEnd } } },
    },
    include: { assetClass: true },
  });

  if (assets.length === 0) return null;

  let totalInvested = 0, totalMarketValue = 0, totalIncome = 0;
  const assetSnapshots: Prisma.PortfolioAssetSnapshotCreateManySnapshotInput[] = [];
  const byClass = new Map<string, { assetClassId: string; invested: number; marketValue: number; targetPercentage: number | null }>();

  for (const ac of assetClasses) {
    byClass.set(ac.id, {
      assetClassId:     ac.id,
      invested:         0,
      marketValue:      0,
      targetPercentage: ac.targetPercentage !== null && ac.targetPercentage !== undefined ? toNum(ac.targetPercentage) : null,
    });
  }

  for (const asset of assets) {
    const txs = await prisma.transaction.findMany({
      where:   { userId, assetId: asset.id, status: 'POSTED', tradeDate: { lte: anchorEnd } },
      orderBy: { tradeDate: 'asc' },
    });

    const { quantity, totalCost } = calcPosition(txs);
    if (quantity <= 0) continue;

    const averagePrice   = totalCost / quantity;
    const investedAmount = quantity * averagePrice;

    const priceRow = await prisma.priceHistory.findFirst({
      where:   { assetId: asset.id, priceDate: { lte: anchorEnd } },
      orderBy: { priceDate: 'desc' },
    });
    const marketPrice = priceRow ? toNum(priceRow.closePrice) : null;
    const marketValue = marketPrice !== null ? quantity * marketPrice : investedAmount;
    const profitLoss  = marketValue - investedAmount;

    const incomeAgg = await prisma.incomeEvent.aggregate({
      where: { userId, assetId: asset.id, status: { in: ['CONFIRMED', 'PAID'] }, paymentDate: { lte: anchorEnd } },
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

    const cls = byClass.get(asset.assetClassId) ?? { assetClassId: asset.assetClassId, invested: 0, marketValue: 0, targetPercentage: null };
    cls.invested    += investedAmount;
    cls.marketValue += marketValue;
    byClass.set(asset.assetClassId, cls);
  }

  if (assetSnapshots.length === 0) return null;

  const totalProfitLoss    = totalMarketValue - totalInvested;
  const totalProfitLossPct = totalInvested > 0 ? totalProfitLoss / totalInvested : 0;

  const classSnapshots: Prisma.PortfolioClassSnapshotCreateManySnapshotInput[] = [...byClass.values()].map((cls) => {
    const currentPct = totalMarketValue > 0 ? cls.marketValue / totalMarketValue : 0;
    const targetPct  = cls.targetPercentage;
    return {
      assetClassId:          cls.assetClassId,
      investedAmount:        new Prisma.Decimal(cls.invested),
      marketValue:           new Prisma.Decimal(cls.marketValue),
      profitLoss:            new Prisma.Decimal(cls.marketValue - cls.invested),
      currentPercentage:     new Prisma.Decimal(currentPct),
      targetPercentage:      targetPct !== null ? new Prisma.Decimal(targetPct) : null,
      rebalanceDifference:   targetPct !== null ? new Prisma.Decimal((targetPct - currentPct) * totalMarketValue) : null,
      suggestedContribution: null,
    };
  });

  const snapshot = await prisma.portfolioSnapshot.upsert({
    where:  { userId_referenceDate_period: { userId, referenceDate: anchor, period } },
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
      userId,
      referenceDate:      anchor,
      period,
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

export async function generateSnapshotRange(
  userId: string,
  startDate: Date,
  endDate:   Date,
  period:    SnapshotPeriodType = 'WEEKLY',
) {
  const dates = period === 'WEEKLY' ? fridaysBetween(startDate, endDate) : weekdaysBetween(startDate, endDate);
  let generated = 0, skipped = 0;
  const errors: { date: string; error: string }[] = [];
  for (const date of dates) {
    try {
      const snap = await generateSnapshot(userId, date, period);
      snap !== null ? generated++ : skipped++;
    } catch (err) {
      errors.push({ date: date.toISOString().slice(0, 10), error: (err as Error).message });
    }
  }
  return { generated, skipped, errors: errors.length, errorDetails: errors };
}

export async function listSnapshots(userId: string, from?: Date, to?: Date, period: SnapshotPeriodType = 'WEEKLY') {
  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: {
      userId,
      period,
      ...(from || to ? { referenceDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    orderBy: { referenceDate: 'desc' },
    include: {
      assetSnapshots: { include: { asset: { select: { ticker: true } } } },
      classSnapshots: { include: { assetClass: { select: { code: true, name: true } } } },
    },
  });
  return snapshots.map(formatSnapshot);
}

export async function getSnapshotByDate(userId: string, referenceDate: Date, period: SnapshotPeriodType = 'WEEKLY') {
  const anchor   = period === 'WEEKLY' ? toFriday(referenceDate) : toMidnightUTC(referenceDate);
  const snapshot = await prisma.portfolioSnapshot.findUnique({
    where: { userId_referenceDate_period: { userId, referenceDate: anchor, period } },
    include: {
      assetSnapshots: { include: { asset: { select: { ticker: true } } } },
      classSnapshots: { include: { assetClass: { select: { code: true, name: true } } } },
    },
  });
  return snapshot ? formatSnapshot(snapshot) : null;
}

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
      targetPercentage:      c.targetPercentage !== null && c.targetPercentage !== undefined ? toNum(c.targetPercentage) : null,
      rebalanceDifference:   c.rebalanceDifference !== null && c.rebalanceDifference !== undefined ? toNum(c.rebalanceDifference) : null,
      suggestedContribution: c.suggestedContribution !== null && c.suggestedContribution !== undefined ? toNum(c.suggestedContribution) : null,
    })),
  };
}
