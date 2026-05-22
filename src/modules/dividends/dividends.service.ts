import { prisma } from '../../core/prisma/prisma.service'
import { DividendsSummaryQueryInput } from './dividends.schema'

const toNum = (v: { toNumber(): number } | null | undefined): number =>
  v ? v.toNumber() : 0

const fmt = (n: number, d = 2): number => Number(n.toFixed(d))

export class DividendsService {
  async getSummary(input: DividendsSummaryQueryInput) {
    // Ano de referência: informado ou ano atual
    const now         = new Date()
    const targetYear  = input.year ?? now.getUTCFullYear()

    // ── Todos os eventos do ano de referência ─────────────────────────────
    const yearStart = new Date(Date.UTC(targetYear, 0, 1))
    const yearEnd   = new Date(Date.UTC(targetYear, 11, 31))

    const allEvents = await prisma.incomeEvent.findMany({
      where: {
        paymentDate: { gte: yearStart, lte: yearEnd },
        status: { not: 'CANCELED' },
      },
      include: { asset: { include: { assetClass: true } } },
      orderBy: { paymentDate: 'asc' },
    })

    // ── Por mês ───────────────────────────────────────────────────────────
    const monthMap: Record<string, {
      month: string
      total: number
      byClass: Record<string, number>
      events: { ticker: string; assetClass: string; paymentDate: string; netAmount: number }[]
    }> = {}

    for (const e of allEvents) {
      if (!e.paymentDate) continue
      const m    = `${e.paymentDate.getUTCFullYear()}-${String(e.paymentDate.getUTCMonth() + 1).padStart(2, '0')}`
      const net  = toNum(e.netAmount ?? e.grossAmount)
      const code = e.asset.assetClass.code

      if (!monthMap[m]) {
        monthMap[m] = { month: m, total: 0, byClass: {}, events: [] }
      }

      monthMap[m]!.total                    += net
      monthMap[m]!.byClass[code]             = (monthMap[m]!.byClass[code] ?? 0) + net
      monthMap[m]!.events.push({
        ticker:      e.asset.ticker,
        assetClass:  code,
        paymentDate: e.paymentDate.toISOString().slice(0, 10),
        netAmount:   fmt(net),
      })
    }

    const byMonth = Object.values(monthMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({
        month:   m.month,
        total:   fmt(m.total),
        byClass: Object.entries(m.byClass).map(([code, total]) => ({ code, total: fmt(total) })),
        events:  m.events,
      }))

    const totalYear = byMonth.reduce((s, m) => s + m.total, 0)
    const avgPerMonth = byMonth.length > 0 ? fmt(totalYear / 12) : 0

    // ── Últimos 12 meses (pode cruzar anos) ───────────────────────────────
    const last12: { month: string; total: number }[] = []
    const refNow = now
    for (let i = 11; i >= 0; i--) {
      const d     = new Date(Date.UTC(refNow.getUTCFullYear(), refNow.getUTCMonth() - i, 1))
      const y     = d.getUTCFullYear()
      const mo    = d.getUTCMonth() + 1
      const first = new Date(Date.UTC(y, mo - 1, 1))
      const last  = new Date(Date.UTC(y, mo, 0))
      const key   = `${y}-${String(mo).padStart(2, '0')}`

      const events = await prisma.incomeEvent.findMany({
        where: { paymentDate: { gte: first, lte: last }, status: { not: 'CANCELED' } },
        select: { grossAmount: true, netAmount: true },
      })

      const total = events.reduce((s, e) => s + toNum(e.netAmount ?? e.grossAmount), 0)
      last12.push({ month: key, total: fmt(total) })
    }

    // ── Média por ano (histórico completo) ────────────────────────────────
    const oldest = await prisma.incomeEvent.findFirst({
      where: { status: { not: 'CANCELED' }, paymentDate: { not: null } },
      orderBy: { paymentDate: 'asc' },
      select: { paymentDate: true },
    })

    const avgPerYear: { year: number; total: number; avgPerMonth: number }[] = []

    if (oldest?.paymentDate) {
      const firstYear = oldest.paymentDate.getUTCFullYear()
      const lastYear  = now.getUTCFullYear()

      for (let yr = firstYear; yr <= lastYear; yr++) {
        const yStart = new Date(Date.UTC(yr, 0, 1))
        const yEnd   = new Date(Date.UTC(yr, 11, 31))

        const evs = await prisma.incomeEvent.findMany({
          where: { paymentDate: { gte: yStart, lte: yEnd }, status: { not: 'CANCELED' } },
          select: { grossAmount: true, netAmount: true },
        })

        const total = evs.reduce((s, e) => s + toNum(e.netAmount ?? e.grossAmount), 0)
        avgPerYear.push({ year: yr, total: fmt(total), avgPerMonth: fmt(total / 12) })
      }
    }

    return {
      year:        targetYear,
      totalYear:   fmt(totalYear),
      avgPerMonth,
      byMonth,
      last12Months: last12,
      avgPerYear,
    }
  }
}

export const dividendsService = new DividendsService()
