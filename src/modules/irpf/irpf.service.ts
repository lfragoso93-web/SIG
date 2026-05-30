import { prisma } from '../../core/prisma/prisma.service'

// ─── Alíquotas e limites ─────────────────────────────────────────────────────

/** Classes brasileiras isentas do limite de R$20k/mês */
const NO_MONTHLY_EXEMPTION = new Set(['FII', 'BDR'])

/** Alíquota swing trade por classe */
function swingRate(classCode: string): number {
  if (classCode === 'FII') return 0.20
  return 0.15
}

/** Alíquota day trade (sempre 20%) */
const DAY_TRADE_RATE = 0.20

/** Isenção mensal de ganho de capital — R$20.000 */
const MONTHLY_EXEMPTION = 20_000

// ─── Helpers ─────────────────────────────────────────────────────────────────

function yearRange(year: number) {
  return {
    gte: new Date(`${year}-01-01T00:00:00Z`),
    lte: new Date(`${year}-12-31T23:59:59Z`),
  }
}

function toYYYYMM(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// ─── Tipos de retorno ─────────────────────────────────────────────────────────

export type MonthlyCapitalGain = {
  month: string
  classCode: string
  className: string
  hasDayTrade: boolean
  grossSales: number
  costBasis: number
  profit: number
  lossCarryIn: number
  taxableBase: number
  irDue: number
  isExempt: boolean
}

export type IncomeRow = {
  ticker: string
  assetName: string
  classCode: string
  className: string
  type: string
  totalGross: number
  irWithheld: number
  netAmount: number
  isExempt: boolean
  paymentMonth: string
}

export type PositionRow = {
  ticker: string
  assetName: string
  classCode: string
  className: string
  quantity: number
  averageCost: number
  totalCost: number
  marketValue: number
}

export type DarfRow = {
  month: string
  classGroup: string
  taxableBase: number
  irDue: number
  rate: number
  dueDate: string
}

export type IrpfSummary = {
  year: number
  totalGainSwing: number
  totalGainDayTrade: number
  totalIrDue: number
  totalIrWithheld: number
  totalExemptIncome: number
  totalTaxableIncome: number
  lossCarryForward: number
  monthlyGains: MonthlyCapitalGain[]
  incomeRows: IncomeRow[]
  positions: PositionRow[]
  darfs: DarfRow[]
}

// ─── Serviço principal ────────────────────────────────────────────────────────

export async function calcIrpf(year: number): Promise<IrpfSummary> {
  const range = yearRange(year)

  // 1. Transações do ano (BUY/SELL) com ativo associado
  const allTx = await prisma.transaction.findMany({
    where: {
      tradeDate: range,
      type: { in: ['BUY', 'SELL'] },
      assetId: { not: undefined },
    },
    include: { asset: { include: { assetClass: true } } },
    orderBy: { tradeDate: 'asc' },
  })

  // 2. Todos os BUYs históricos dos ativos do portfólio (custo médio correto)
  const assetIds = [...new Set(allTx.map((t) => t.assetId).filter((id): id is string => id !== null))]
  const allBuys = await prisma.transaction.findMany({
    where: {
      assetId: { in: assetIds },
      type: 'BUY',
    },
    orderBy: { tradeDate: 'asc' },
  })

  // 3. Custo médio ponderado acumulado por ativo
  type AvgCostEntry = { quantity: number; totalCost: number }
  const avgCostMap = new Map<string, AvgCostEntry>()

  for (const tx of allBuys) {
    const id  = tx.assetId!
    const qty = Number(tx.quantity ?? 0)
    const net = Number(tx.netAmount ?? tx.grossAmount)
    const cur = avgCostMap.get(id) ?? { quantity: 0, totalCost: 0 }
    avgCostMap.set(id, {
      quantity:  cur.quantity  + qty,
      totalCost: cur.totalCost + net,
    })
  }

  // 4. Detecção de day trade: mesmo ativo, mesmo dia, BUY + SELL
  const dtKey = (assetId: string | null, date: Date) =>
    `${assetId}_${date.toISOString().slice(0, 10)}`

  const dayMap = new Map<string, { hasBuy: boolean; hasSell: boolean }>()
  for (const tx of allTx) {
    const k   = dtKey(tx.assetId, tx.tradeDate)
    const cur = dayMap.get(k) ?? { hasBuy: false, hasSell: false }
    if (tx.type === 'BUY')  cur.hasBuy  = true
    if (tx.type === 'SELL') cur.hasSell = true
    dayMap.set(k, cur)
  }
  const isDayTrade = (assetId: string | null, date: Date) => {
    const e = dayMap.get(dtKey(assetId, date))
    return !!(e?.hasBuy && e?.hasSell)
  }

  // 5. Agrupa vendas por mês × classe
  type SellGroup = {
    classCode: string; className: string
    hasDayTrade: boolean; grossSales: number; costBasis: number
  }
  const sellMap = new Map<string, SellGroup>()

  for (const tx of allTx) {
    if (tx.type !== 'SELL' || !tx.asset) continue
    const month     = toYYYYMM(tx.tradeDate)
    const classCode = tx.asset.assetClass.code
    const key       = `${month}|${classCode}`
    const qty       = Number(tx.quantity ?? 0)
    const gross     = Number(tx.netAmount ?? tx.grossAmount)
    const avg       = avgCostMap.get(tx.assetId!)
    const avgUnit   = avg && avg.quantity > 0 ? avg.totalCost / avg.quantity : 0
    const dt        = isDayTrade(tx.assetId, tx.tradeDate)

    const cur = sellMap.get(key) ?? {
      classCode, className: tx.asset.assetClass.name,
      hasDayTrade: false, grossSales: 0, costBasis: 0,
    }
    cur.grossSales += gross
    cur.costBasis  += qty * avgUnit
    if (dt) cur.hasDayTrade = true
    sellMap.set(key, cur)
  }

  // 6. Isenção + compensação de prejuízos sequencial por classe
  const lossBalance = new Map<string, number>()
  const monthlyGains: MonthlyCapitalGain[] = []

  for (const key of Array.from(sellMap.keys()).sort()) {
    const [month, classCode] = key.split('|')
    const g      = sellMap.get(key)!
    const profit = g.grossSales - g.costBasis

    const applyExemption =
      !g.hasDayTrade && !NO_MONTHLY_EXEMPTION.has(classCode) && g.grossSales <= MONTHLY_EXEMPTION

    const profitAfterExemption = applyExemption ? 0 : profit
    const prevLoss = lossBalance.get(classCode) ?? 0
    let taxableBase: number
    let usedLoss: number

    if (profitAfterExemption > 0 && prevLoss < 0) {
      usedLoss    = Math.min(profitAfterExemption, Math.abs(prevLoss))
      taxableBase = profitAfterExemption - usedLoss
      lossBalance.set(classCode, prevLoss + usedLoss)
    } else if (profitAfterExemption <= 0) {
      usedLoss    = 0
      taxableBase = 0
      lossBalance.set(classCode, prevLoss + profitAfterExemption)
    } else {
      usedLoss    = 0
      taxableBase = profitAfterExemption
    }

    const rate  = g.hasDayTrade ? DAY_TRADE_RATE : swingRate(classCode)
    const irDue = taxableBase > 0 ? taxableBase * rate : 0

    monthlyGains.push({
      month, classCode, className: g.className,
      hasDayTrade: g.hasDayTrade,
      grossSales: g.grossSales, costBasis: g.costBasis,
      profit, lossCarryIn: usedLoss, taxableBase, irDue,
      isExempt: applyExemption,
    })
  }

  // 7. Rendimentos do ano (income_events)
  const incomeEvents = await prisma.incomeEvent.findMany({
    where: { paymentDate: range },
    include: { asset: { include: { assetClass: true } } },
    orderBy: { paymentDate: 'asc' },
  })

  type IncomeAgg = {
    ticker: string; assetName: string
    classCode: string; className: string
    type: string; totalGross: number; paymentMonth: string
  }
  const incomeMap = new Map<string, IncomeAgg>()

  for (const ev of incomeEvents) {
    const key   = `${ev.assetId}|${ev.type}`
    const gross = Number(ev.amountPerUnit ?? 0)
    const existing = incomeMap.get(key)
    if (existing) {
      existing.totalGross += gross
    } else {
      incomeMap.set(key, {
        ticker:       ev.asset.ticker,
        assetName:    ev.asset.name,
        classCode:    ev.asset.assetClass.code,
        className:    ev.asset.assetClass.name,
        type:         ev.type as string,
        totalGross:   gross,
        paymentMonth: ev.paymentDate ? toYYYYMM(ev.paymentDate) : '',
      })
    }
  }

  const incomeRows: IncomeRow[] = Array.from(incomeMap.values()).map((r) => {
    const isJcp      = r.type === 'JCP'
    const isFii      = r.type === 'FII_INCOME'
    const irWithheld = isJcp ? r.totalGross * 0.15 : 0
    return {
      ticker: r.ticker, assetName: r.assetName,
      classCode: r.classCode, className: r.className,
      type: r.type, totalGross: r.totalGross,
      irWithheld,
      netAmount:    r.totalGross - irWithheld,
      isExempt:     isFii || !isJcp,
      paymentMonth: r.paymentMonth,
    }
  })

  // 8. Posições atuais — Bens e Direitos
  const portfolioItems = await prisma.portfolioItem.findMany({
    include: { asset: { include: { assetClass: true } } },
  })

  const positions: PositionRow[] = portfolioItems.map((p) => {
    const qty = Number(p.quantity)
    const avg = Number(p.averagePrice ?? 0)
    return {
      ticker:      p.asset.ticker,
      assetName:   p.asset.name,
      classCode:   p.asset.assetClass.code,
      className:   p.asset.assetClass.name,
      quantity:    qty,
      averageCost: avg,
      totalCost:   qty * avg,
      marketValue: Number(p.marketPrice ?? 0) * qty,
    }
  })

  // 9. DARFs por mês × grupo
  const darfMap = new Map<string, DarfRow>()
  for (const g of monthlyGains) {
    if (g.irDue <= 0) continue
    const group = g.hasDayTrade ? 'Day Trade' : g.classCode === 'FII' ? 'FIIs' : 'Renda Variável'
    const key   = `${g.month}|${group}`
    const cur   = darfMap.get(key) ?? {
      month: g.month, classGroup: group,
      taxableBase: 0, irDue: 0,
      rate:    g.hasDayTrade ? DAY_TRADE_RATE : swingRate(g.classCode),
      dueDate: lastDayNextMonth(g.month),
    }
    cur.taxableBase += g.taxableBase
    cur.irDue       += g.irDue
    darfMap.set(key, cur)
  }
  const darfs = Array.from(darfMap.values()).sort((a, b) => a.month.localeCompare(b.month))

  // 10. Totalizadores
  return {
    year,
    totalGainSwing:     monthlyGains.filter((g) => !g.hasDayTrade).reduce((s, g) => s + g.profit, 0),
    totalGainDayTrade:  monthlyGains.filter((g) =>  g.hasDayTrade).reduce((s, g) => s + g.profit, 0),
    totalIrDue:         monthlyGains.reduce((s, g) => s + g.irDue, 0),
    totalIrWithheld:    incomeRows.reduce((s, r) => s + r.irWithheld, 0),
    totalExemptIncome:  incomeRows.filter((r) =>  r.isExempt).reduce((s, r) => s + r.netAmount, 0),
    totalTaxableIncome: incomeRows.filter((r) => !r.isExempt).reduce((s, r) => s + r.netAmount, 0),
    lossCarryForward:   Array.from(lossBalance.values()).reduce((s, v) => s + Math.min(v, 0), 0),
    monthlyGains,
    incomeRows,
    positions,
    darfs,
  }
}

/** Último dia do mês seguinte — vencimento simplificado da DARF */
function lastDayNextMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  const nm  = m === 12 ? 1  : m + 1
  const ny  = m === 12 ? y + 1 : y
  const day = new Date(ny, nm, 0).getDate()
  return `${ny}-${String(nm).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
