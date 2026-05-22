import { prisma } from '../../core/prisma/prisma.service'
import { DividendsSummaryQueryInput } from './dividends.schema'

const toNum = (v: { toNumber(): number } | null | undefined): number =>
  v ? v.toNumber() : 0

const fmt = (n: number, d = 2): number => Number(n.toFixed(d))

export class DividendsService {
  async getSummary(input: DividendsSummaryQueryInput) {
    const now        = new Date()
    const targetYear = input.year ?? now.getUTCFullYear()

    const yearStart = new Date(Date.UTC(targetYear, 0, 1))
    const yearEnd   = new Date(Date.UTC(targetYear, 11, 31))

    // ── Eventos do ano com paymentDate preenchido ────────────────────────────
    const allEvents = await prisma.incomeEvent.findMany({
      where: {
        paymentDate: { gte: yearStart, lte: yearEnd, not: null },
        status:      { not: 'CANCELED' },
      },
      include: { asset: { include: { assetClass: true } } },
      orderBy: { paymentDate: 'asc' },
    })

    // ── Por mês ──────────────────────────────────────────────────────────────
    const monthMap: Record<string, {
      month:   string
      total:   number
      byClass: Record<string, number>
      events:  { ticker: string; assetClass: string; paymentDate: string; netAmount: number }[]
    }> = {}

    for (const e of allEvents) {
      if (!e.paymentDate) continue
      const m   = `${e.paymentDate.getUTCFullYear()}-${String(e.paymentDate.getUTCMonth() + 1).padStart(2, '0')}`
      const net = toNum(e.netAmount ?? e.grossAmount)
      const code = e.asset.assetClass.code

      if (!monthMap[m]) monthMap[m] = { month: m, total: 0, byClass: {}, events: [] }

      monthMap[m]!.total            += net
      monthMap[m]!.byClass[code]     = (monthMap[m]!.byClass[code] ?? 0) + net
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

    const totalYear   = byMonth.reduce((s, m) => s + m.total, 0)
    const avgPerMonth = fmt(totalYear / 12)

    // ── Últimos 12 meses (pode cruzar anos) ─────────────────────────────────
    const last12: { month: string; total: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d     = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
      const y     = d.getUTCFullYear()
      const mo    = d.getUTCMonth() + 1
      const first = new Date(Date.UTC(y, mo - 1, 1))
      const last  = new Date(Date.UTC(y, mo, 0))
      const key   = `${y}-${String(mo).padStart(2, '0')}`

      const events = await prisma.incomeEvent.findMany({
        where: { paymentDate: { gte: first, lte: last, not: null }, status: { not: 'CANCELED' } },
        select: { grossAmount: true, netAmount: true },
      })

      const total = events.reduce((s, e) => s + toNum(e.netAmount ?? e.grossAmount), 0)
      last12.push({ month: key, total: fmt(total) })
    }

    // ── Média por ano — apenas anos com ao menos 1 evento com paymentDate ───
    const oldest = await prisma.incomeEvent.findFirst({
      where: { status: { not: 'CANCELED' }, paymentDate: { not: null } },
      orderBy: { paymentDate: 'asc' },
      select: { paymentDate: true },
    })

    const avgPerYear: { year: number; total: number; avgPerMonth: number }[] = []

    if (oldest?.paymentDate) {
      const firstYear = oldest.paymentDate.getUTCFullYear()
      // Só itera a partir do primeiro ano com dado real
      for (let yr = firstYear; yr <= now.getUTCFullYear(); yr++) {
        const yStart = new Date(Date.UTC(yr, 0, 1))
        const yEnd   = new Date(Date.UTC(yr, 11, 31))

        const evs = await prisma.incomeEvent.findMany({
          where: { paymentDate: { gte: yStart, lte: yEnd, not: null }, status: { not: 'CANCELED' } },
          select: { grossAmount: true, netAmount: true },
        })

        // Só inclui anos que de fato têm eventos
        if (evs.length === 0) continue

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
