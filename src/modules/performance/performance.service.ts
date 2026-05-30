import { Prisma, SnapshotPeriod, TransactionType } from '@prisma/client'
import { prisma } from '../../core/prisma/prisma.service'
import {
  PerformanceSummaryQueryInput,
  PerformanceTimelineQueryInput,
  PerformanceByClassQueryInput,
} from './performance.schema'

type PerformanceSummaryResult = {
  startReferenceDate: string
  endReferenceDate: string
  requestedStartDate: string
  requestedEndDate: string
  period: SnapshotPeriod
  initialMarketValue: number
  finalMarketValue: number
  netContributions: number
  capitalGain: number
  absoluteChange: number
  returnPercentage: number | null
}

const decimalToNumber = (value: Prisma.Decimal | null | undefined) => {
  if (!value) return 0
  return value.toNumber()
}

const formatDate = (date: Date) => date.toISOString().slice(0, 10)

export class PerformanceService {
  async getSummary(userId: string, query: PerformanceSummaryQueryInput): Promise<PerformanceSummaryResult> {
    const { startDate, endDate } = query
    const period = query.period ?? SnapshotPeriod.WEEKLY

    const [startSnapshot, endSnapshot] = await Promise.all([
      prisma.portfolioSnapshot.findFirst({
        where: { userId, period, referenceDate: { lte: startDate } },
        orderBy: { referenceDate: 'desc' },
      }),
      prisma.portfolioSnapshot.findFirst({
        where: { userId, period, referenceDate: { lte: endDate } },
        orderBy: { referenceDate: 'desc' },
      }),
    ])

    if (!startSnapshot) throw new Error('Nenhum snapshot inicial encontrado para os filtros informados.')
    if (!endSnapshot)   throw new Error('Nenhum snapshot final encontrado para os filtros informados.')
    if (startSnapshot.referenceDate > endSnapshot.referenceDate) throw new Error('O snapshot inicial encontrado é posterior ao snapshot final.')

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        tradeDate: { gt: startSnapshot.referenceDate, lte: endSnapshot.referenceDate },
        type: { in: [TransactionType.BUY, TransactionType.SELL] },
      },
      select: { type: true, grossAmount: true },
    })

    const netContributions = transactions.reduce((sum, tx) => {
      const amount = decimalToNumber(tx.grossAmount)
      if (tx.type === TransactionType.BUY)  return sum + amount
      if (tx.type === TransactionType.SELL) return sum - amount
      return sum
    }, 0)

    const initialMarketValue   = decimalToNumber(startSnapshot.totalMarketValue)
    const finalMarketValue     = decimalToNumber(endSnapshot.totalMarketValue)
    const absoluteChange       = finalMarketValue - initialMarketValue
    const capitalGain          = finalMarketValue - initialMarketValue - netContributions
    const investedCapitalBase  = initialMarketValue + netContributions
    const returnPercentage     = investedCapitalBase > 0 ? capitalGain / investedCapitalBase : null

    return {
      startReferenceDate: formatDate(startSnapshot.referenceDate),
      endReferenceDate:   formatDate(endSnapshot.referenceDate),
      requestedStartDate: formatDate(startDate),
      requestedEndDate:   formatDate(endDate),
      period,
      initialMarketValue:  Number(initialMarketValue.toFixed(2)),
      finalMarketValue:    Number(finalMarketValue.toFixed(2)),
      netContributions:    Number(netContributions.toFixed(2)),
      capitalGain:         Number(capitalGain.toFixed(2)),
      absoluteChange:      Number(absoluteChange.toFixed(2)),
      returnPercentage:    returnPercentage !== null ? Number(returnPercentage.toFixed(6)) : null,
    }
  }

  async getTimeline(userId: string, query: PerformanceTimelineQueryInput) {
    const { startDate, endDate } = query
    const period = query.period ?? SnapshotPeriod.WEEKLY

    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: { userId, period, referenceDate: { gte: startDate, lte: endDate } },
      orderBy: { referenceDate: 'asc' },
    })

    const points = snapshots.map((s) => ({
      referenceDate:      formatDate(s.referenceDate),
      period:             s.period,
      totalInvested:      Number(decimalToNumber(s.totalInvested).toFixed(2)),
      totalMarketValue:   Number(decimalToNumber(s.totalMarketValue).toFixed(2)),
      totalProfitLoss:    Number(decimalToNumber(s.totalProfitLoss).toFixed(2)),
      totalProfitLossPct: s.totalProfitLossPct !== null ? Number(decimalToNumber(s.totalProfitLossPct).toFixed(6)) : null,
      totalIncome:        Number(decimalToNumber(s.totalIncome).toFixed(2)),
      cashBalance:        Number(decimalToNumber(s.cashBalance).toFixed(2)),
    }))

    return {
      requestedStartDate: formatDate(startDate),
      requestedEndDate:   formatDate(endDate),
      period,
      points,
      chart: {
        labels: points.map((p) => p.referenceDate),
        series: {
          totalInvested:    points.map((p) => p.totalInvested),
          totalMarketValue: points.map((p) => p.totalMarketValue),
          totalProfitLoss:  points.map((p) => p.totalProfitLoss),
          totalIncome:      points.map((p) => p.totalIncome),
          cashBalance:      points.map((p) => p.cashBalance),
        },
      },
    }
  }

  async getByClass(userId: string, query: PerformanceByClassQueryInput) {
    const { endDate, monthlyContribution } = query
    const period = query.period ?? SnapshotPeriod.WEEKLY

    const snapshot = await prisma.portfolioSnapshot.findFirst({
      where: { userId, period, referenceDate: { lte: endDate } },
      orderBy: { referenceDate: 'desc' },
      include: {
        classSnapshots: {
          include: { assetClass: true },
          orderBy: { assetClass: { displayOrder: 'asc' } },
        },
      },
    })

    if (!snapshot) throw new Error('Nenhum snapshot encontrado para os filtros informados.')

    const totalMarketValue = decimalToNumber(snapshot.totalMarketValue) || 0

    const baseClasses = snapshot.classSnapshots.map((item) => {
      const investedAmount   = decimalToNumber(item.investedAmount)
      const marketValue      = decimalToNumber(item.marketValue)
      const profitLoss       = decimalToNumber(item.profitLoss)
      const currentPct       = item.currentPercentage !== null ? decimalToNumber(item.currentPercentage) : null
      const targetPct        = item.targetPercentage  !== null ? decimalToNumber(item.targetPercentage)  : null
      let rebalanceDifference: number | null = null
      if (targetPct !== null && currentPct !== null) {
        rebalanceDifference = Number(((targetPct - currentPct) * totalMarketValue).toFixed(2))
      }
      return { assetClassId: item.assetClassId, code: item.assetClass.code, name: item.assetClass.name, investedAmount: Number(investedAmount.toFixed(2)), marketValue: Number(marketValue.toFixed(2)), profitLoss: Number(profitLoss.toFixed(2)), currentPercentage: currentPct !== null ? Number(currentPct.toFixed(6)) : null, targetPercentage: targetPct !== null ? Number(targetPct.toFixed(6)) : null, rebalanceDifference, suggestedContribution: null as number | null }
    })

    const positiveGapsTotal = baseClasses.reduce((sum, i) => (i.rebalanceDifference !== null && i.rebalanceDifference > 0 ? sum + i.rebalanceDifference : sum), 0)

    const classes = baseClasses.map((item) => {
      if (item.rebalanceDifference === null || item.rebalanceDifference <= 0 || positiveGapsTotal <= 0) {
        return { ...item, suggestedContribution: item.rebalanceDifference !== null ? 0 : null }
      }
      return { ...item, suggestedContribution: Number(((monthlyContribution * item.rebalanceDifference) / positiveGapsTotal).toFixed(2)) }
    })

    return { requestedEndDate: formatDate(endDate), snapshotReferenceDate: formatDate(snapshot.referenceDate), period, classes }
  }
}

export const performanceService = new PerformanceService()
