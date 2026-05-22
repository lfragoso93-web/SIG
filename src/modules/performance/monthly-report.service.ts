import { Prisma, SnapshotPeriod, TransactionType } from '@prisma/client'
import { prisma } from '../../core/prisma/prisma.service'
import { MonthlyReportQueryInput } from './performance.schema'

const toNum = (v: Prisma.Decimal | null | undefined): number =>
  v ? v.toNumber() : 0

const fmt = (n: number, decimals = 2): number =>
  Number(n.toFixed(decimals))

const fmtDate = (d: Date): string => d.toISOString().slice(0, 10)

/** Retorna a última sexta-feira <= date (inclusive) */
function lastFridayOnOrBefore(date: Date): Date {
  const d = new Date(date)
  const dow = d.getUTCDay() // 0=dom … 5=sex … 6=sab
  const diff = dow >= 5 ? dow - 5 : dow + 2
  d.setUTCDate(d.getUTCDate() - diff)
  return d
}

export class MonthlyReportService {
  async getMonthlyReport(input: MonthlyReportQueryInput) {
    const { month, monthlyContribution } = input
    const [year, mon] = month.split('-').map(Number) as [number, number]

    // Primeiro e último dia do mês
    const firstDay = new Date(Date.UTC(year, mon - 1, 1))
    const lastDay  = new Date(Date.UTC(year, mon, 0))

    // Primeiro e último dia do mês anterior
    const firstDayPrevMonth = new Date(Date.UTC(year, mon - 2, 1))
    const lastDayPrevMonth  = new Date(Date.UTC(year, mon - 1, 0))

    // Snapshots de referência (última sexta <= fim do mês)
    const endSnapshotDate      = lastFridayOnOrBefore(lastDay)
    const startSnapshotDate    = lastFridayOnOrBefore(lastDayPrevMonth)
    const prevStartSnapshotDate = lastFridayOnOrBefore(
      new Date(Date.UTC(year, mon - 3, 0)) // última sexta do mês 2 atrás
    )

    const period = SnapshotPeriod.WEEKLY

    const [prevStartSnapshot, startSnapshot, endSnapshot] = await Promise.all([
      prisma.portfolioSnapshot.findFirst({
        where: { period, referenceDate: { lte: prevStartSnapshotDate } },
        orderBy: { referenceDate: 'desc' },
        select: { totalMarketValue: true, referenceDate: true },
      }),
      prisma.portfolioSnapshot.findFirst({
        where: { period, referenceDate: { lte: startSnapshotDate } },
        orderBy: { referenceDate: 'desc' },
        include: {
          classSnapshots: {
            include: { assetClass: true },
            orderBy: { assetClass: { displayOrder: 'asc' } },
          },
        },
      }),
      prisma.portfolioSnapshot.findFirst({
        where: { period, referenceDate: { lte: endSnapshotDate } },
        orderBy: { referenceDate: 'desc' },
        include: {
          classSnapshots: {
            include: { assetClass: true },
            orderBy: { assetClass: { displayOrder: 'asc' } },
          },
        },
      }),
    ])

    if (!endSnapshot) {
      throw new Error('Nenhum snapshot encontrado para o mês informado.')
    }

    // ── Patrimônio ──────────────────────────────────────────────────────────
    const startValue     = startSnapshot ? toNum(startSnapshot.totalMarketValue) : 0
    const endValue       = toNum(endSnapshot.totalMarketValue)
    const absoluteChange = endValue - startValue

    const transactions = await prisma.transaction.findMany({
      where: {
        tradeDate: { gte: firstDay, lte: lastDay },
        type: { in: [TransactionType.BUY, TransactionType.SELL] },
      },
      select: { type: true, grossAmount: true },
    })

    const netContributions = transactions.reduce((sum, tx) => {
      const a = toNum(tx.grossAmount)
      return tx.type === TransactionType.BUY ? sum + a : sum - a
    }, 0)

    const capitalGain = absoluteChange - netContributions
    const base        = startValue + netContributions
    const returnPct   = base > 0 ? capitalGain / base : null

    // ── Evolução 12 meses ───────────────────────────────────────────────────
    const chart12 = await this.getLast12MonthsChart(year, mon, period)

    // ── Por classe ──────────────────────────────────────────────────────────
    const totalMV = endValue || 0
    const positiveGapsTotal = endSnapshot.classSnapshots.reduce((sum, cs) => {
      if (cs.targetPercentage === null) return sum
      const target  = toNum(cs.targetPercentage)
      const current = toNum(cs.currentPercentage)
      const gap = (target - current) * totalMV
      return gap > 0 ? sum + gap : sum
    }, 0)

    const byClass = endSnapshot.classSnapshots.map((cs) => {
      const marketValue    = toNum(cs.marketValue)
      const investedAmount = toNum(cs.investedAmount)
      const profitLoss     = toNum(cs.profitLoss)
      const currentPct     = cs.currentPercentage !== null ? toNum(cs.currentPercentage) : null
      const targetPct      = cs.targetPercentage  !== null ? toNum(cs.targetPercentage)  : null

      let rebalanceDiff: number | null    = null
      let suggestedContrib: number | null = null

      if (targetPct !== null && currentPct !== null) {
        const gap = (targetPct - currentPct) * totalMV
        rebalanceDiff = fmt(gap)
        suggestedContrib = (gap > 0 && positiveGapsTotal > 0)
          ? fmt((monthlyContribution * gap) / positiveGapsTotal)
          : 0
      }

      return {
        code:                  cs.assetClass.code,
        name:                  cs.assetClass.name,
        marketValue:           fmt(marketValue),
        investedAmount:        fmt(investedAmount),
        profitLoss:            fmt(profitLoss),
        currentPercentage:     currentPct !== null ? fmt(currentPct, 6) : null,
        targetPercentage:      targetPct  !== null ? fmt(targetPct,  6) : null,
        rebalanceDifference:   rebalanceDiff,
        suggestedContribution: suggestedContrib,
      }
    })

    // ── Dividendos do mês ───────────────────────────────────────────────────
    const incomeEvents = await prisma.incomeEvent.findMany({
      where: {
        paymentDate: { gte: firstDay, lte: lastDay },
        status: { not: 'CANCELED' },
      },
      include: { asset: { include: { assetClass: true } } },
    })

    const totalDividends = incomeEvents.reduce((sum, e) =>
      sum + toNum(e.netAmount ?? e.grossAmount), 0)

    const dividendsByClass: Record<string, number> = {}
    for (const e of incomeEvents) {
      const code = e.asset.assetClass.code
      dividendsByClass[code] = (dividendsByClass[code] ?? 0) + toNum(e.netAmount ?? e.grossAmount)
    }

    const dividendsLast12 = await this.getDividendsLast12Months(year, mon)

    // ── Comparação mês anterior ─────────────────────────────────────────────
    let prevMonthComparison: {
      month: string
      startValue: number
      endValue: number
      absoluteChange: number
      returnPct: number | null
    } | null = null

    if (startSnapshot) {
      const prevStart  = prevStartSnapshot ? toNum(prevStartSnapshot.totalMarketValue) : 0
      const prevEnd    = toNum(startSnapshot.totalMarketValue)
      const prevChange = prevEnd - prevStart

      const prevTx = await prisma.transaction.findMany({
        where: {
          tradeDate: { gte: firstDayPrevMonth, lte: lastDayPrevMonth },
          type: { in: [TransactionType.BUY, TransactionType.SELL] },
        },
        select: { type: true, grossAmount: true },
      })
      const prevNet  = prevTx.reduce((s, tx) => {
        const a = toNum(tx.grossAmount)
        return tx.type === TransactionType.BUY ? s + a : s - a
      }, 0)
      const prevGain = prevChange - prevNet
      const prevBase = prevStart + prevNet
      const prevMon  = mon - 1 === 0 ? 12 : mon - 1
      const prevYear = mon - 1 === 0 ? year - 1 : year

      prevMonthComparison = {
        month:          `${prevYear}-${String(prevMon).padStart(2, '0')}`,
        startValue:     fmt(prevStart),
        endValue:       fmt(prevEnd),
        absoluteChange: fmt(prevChange),
        returnPct:      prevBase > 0 ? fmt(prevGain / prevBase, 6) : null,
      }
    }

    return {
      period: {
        month,
        startDate:         fmtDate(firstDay),
        endDate:           fmtDate(lastDay),
        startSnapshotDate: startSnapshot ? fmtDate(startSnapshot.referenceDate) : null,
        endSnapshotDate:   fmtDate(endSnapshot.referenceDate),
      },
      patrimony: {
        startValue:       fmt(startValue),
        endValue:         fmt(endValue),
        absoluteChange:   fmt(absoluteChange),
        returnPct:        returnPct !== null ? fmt(returnPct, 6) : null,
        netContributions: fmt(netContributions),
        capitalGain:      fmt(capitalGain),
        chart:            chart12,
      },
      byClass,
      dividends: {
        totalMonth:   fmt(totalDividends),
        byClass:      Object.entries(dividendsByClass).map(([code, total]) => ({ code, total: fmt(total) })),
        last12Months: dividendsLast12,
      },
      comparison: {
        previousMonth: prevMonthComparison,
      },
    }
  }

  private async getLast12MonthsChart(year: number, mon: number, period: SnapshotPeriod) {
    const points: { month: string; marketValue: number; totalInvested: number }[] = []

    for (let i = 11; i >= 0; i--) {
      const d     = new Date(Date.UTC(year, mon - 1 - i, 1))
      const y     = d.getUTCFullYear()
      const m     = d.getUTCMonth() + 1
      const lastD = new Date(Date.UTC(y, m, 0))
      const ref   = lastFridayOnOrBefore(lastD)

      const snap = await prisma.portfolioSnapshot.findFirst({
        where: { period, referenceDate: { lte: ref } },
        orderBy: { referenceDate: 'desc' },
        select: { totalMarketValue: true, totalInvested: true },
      })

      points.push({
        month:         `${y}-${String(m).padStart(2, '0')}`,
        marketValue:   snap ? fmt(toNum(snap.totalMarketValue)) : 0,
        totalInvested: snap ? fmt(toNum(snap.totalInvested))    : 0,
      })
    }

    return points
  }

  private async getDividendsLast12Months(year: number, mon: number) {
    const points: { month: string; total: number }[] = []

    for (let i = 11; i >= 0; i--) {
      const d     = new Date(Date.UTC(year, mon - 1 - i, 1))
      const y     = d.getUTCFullYear()
      const m     = d.getUTCMonth() + 1
      const first = new Date(Date.UTC(y, m - 1, 1))
      const last  = new Date(Date.UTC(y, m, 0))

      const events = await prisma.incomeEvent.findMany({
        where: { paymentDate: { gte: first, lte: last }, status: { not: 'CANCELED' } },
        select: { grossAmount: true, netAmount: true },
      })

      const total = events.reduce((s, e) => s + toNum(e.netAmount ?? e.grossAmount), 0)
      points.push({ month: `${y}-${String(m).padStart(2, '0')}`, total: fmt(total) })
    }

    return points
  }
}

export const monthlyReportService = new MonthlyReportService()
