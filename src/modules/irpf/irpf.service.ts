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

function yyyymm(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// ─── Tipos de retorno ─────────────────────────────────────────────────────────

export type MonthlyCapitalGain = {
  month: string           // 'YYYY-MM'
  classCode: string
  className: string
  hasDayTrade: boolean
  grossSales: number      // receita bruta de vendas
  costBasis: number       // custo médio das ações vendidas
  profit: number          // lucro bruto
  lossCarryIn: number     // prejuízo acumulado usado
  taxableBase: number     // base de cálculo (após isenção e compensação)
  irDue: number           // IR calculado
  isExempt: boolean       // isenção mensal de 20k aplicada
}

export type IncomeRow = {
  ticker: string
  assetName: string
  classCode: string
  className: string
  type: string            // DIVIDEND | JCP | FII_INCOME
  totalGross: number
  irWithheld: number      // 15% retido p/ JCP
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
  totalCost: number       // quantidade × custo médio (para declaração)
  marketValue: number     // valor de mercado em 31/12 (best-effort)
}

export type DarfRow = {
  month: string
  classGroup: string      // 'Renda Variável' | 'FIIs' | 'Day Trade'
  taxableBase: number
  irDue: number
  rate: number
  dueDate: string         // último dia útil do mês seguinte (simplificado)
}

export type IrpfSummary = {
  year: number
  totalGainSwing: number
  totalGainDayTrade: number
  totalIrDue: number
  totalIrWithheld: number // retido na fonte (JCP)
  totalExemptIncome: number
  totalTaxableIncome: number
  lossCarryForward: number // prejuízo acumulado não compensado no ano
  monthlyGains: MonthlyCapitalGain[]
  incomeRows: IncomeRow[]
  positions: PositionRow[]
  darfs: DarfRow[]
}

// ─── Serviço principal ────────────────────────────────────────────────────────

export async function calcIrpf(year: number): Promise<IrpfSummary> {
  const range = yearRange(year)

  // 1. Busca todas as transações do ano filtradas por BUY/SELL em ativos BR
  const allTx = await prisma.transaction.findMany({
    where: {
      tradeDate: range,
      type: { in: ['BUY', 'SELL'] },
      assetId: { not: null },
    },
    include: { asset: { include: { assetClass: true } } },
    orderBy: { tradeDate: 'asc' },
  })

  // 2. Busca TODOS os BUYs históricos (para custo médio correto) de ativos presentes no portfólio
  const assetIds = [...new Set(allTx.map((t) => t.assetId!))]
  const allBuys = await prisma.transaction.findMany({
    where: {
      assetId: { in: assetIds },
      type: 'BUY',
    },
    include: { asset: { include: { assetClass: true } } },
    orderBy: { tradeDate: 'asc' },
  })

  // 3. Calcula custo médio ponderado acumulado por ativo (FIFO por preço médio)
  //    Estrutura: assetId → { quantity: number; totalCost: number }
  type AvgCostEntry = { quantity: number; totalCost: number }
  const avgCostMap = new Map<string, AvgCostEntry>()

  for (const tx of allBuys) {
    const id  = tx.assetId!
    const qty = Number(tx.quantity ?? 0)
    const net = Number(tx.netAmount ?? tx.grossAmount)
    const cur = avgCostMap.get(id) ?? { quantity: 0, totalCost: 0 }
    const newQty  = cur.quantity + qty
    const newCost = cur.totalCost + net
    avgCostMap.set(id, { quantity: newQty, totalCost: newCost })
  }

  // 4. Detecta day trades: (assetId + date) com BUY e SELL no mesmo dia
  const dtKey = (tx: { assetId: string | null; tradeDate: Date }) =>
    `${tx.assetId}_${tx.tradeDate.toISOString().slice(0, 10)}`

  const yearTxByKey = new Map<string, { hasBuy: boolean; hasSell: boolean }>()
  for (const tx of allTx) {
    const k   = dtKey(tx)
    const cur = yearTxByKey.get(k) ?? { hasBuy: false, hasSell: false }
    if (tx.type === 'BUY')  cur.hasBuy  = true
    if (tx.type === 'SELL') cur.hasSell = true
    yearTxByKey.set(k, cur)
  }
  const isDayTrade = (tx: { assetId: string | null; tradeDate: Date }) => {
    const e = yearTxByKey.get(dtKey(tx))
    return !!(e?.hasBuy && e?.hasSell)
  }

  // 5. Agrupa vendas por mês × classe
  type SellGroup = {
    classCode: string
    className: string
    hasDayTrade: boolean
    grossSales: number
    costBasis: number
  }
  const sellMap = new Map<string, SellGroup>() // key: 'YYYY-MM|classCode'

  for (const tx of allTx) {
    if (tx.type !== 'SELL' || !tx.asset) continue
    const month     = yyyymm(tx.tradeDate)
    const classCode = tx.asset.assetClass.code
    const className = tx.asset.assetClass.name
    const key       = `${month}|${classCode}`
    const qty       = Number(tx.quantity ?? 0)
    const gross     = Number(tx.netAmount ?? tx.grossAmount)
    const avg       = avgCostMap.get(tx.assetId!)
    const avgUnit   = avg && avg.quantity > 0 ? avg.totalCost / avg.quantity : 0
    const cost      = qty * avgUnit
    const dt        = isDayTrade(tx)

    const cur = sellMap.get(key) ?? { classCode, className, hasDayTrade: false, grossSales: 0, costBasis: 0 }
    cur.grossSales += gross
    cur.costBasis  += cost
    if (dt) cur.hasDayTrade = true
    sellMap.set(key, cur)
  }

  // 6. Aplica isenção + compensação de prejuízos (por classe, acumulando no ano)
  //    Saldo de prejuízo: separado por grupo (RV normal, FII, DayTrade)
  const lossBalance = new Map<string, number>() // classCode → saldo negativo acumulado

  const monthlyGains: MonthlyCapitalGain[] = []

  // Ordena por mês para compensação sequencial
  const sortedKeys = Array.from(sellMap.keys()).sort()

  for (const key of sortedKeys) {
    const [month, classCode] = key.split('|')
    const g = sellMap.get(key)!
    const profit = g.grossSales - g.costBasis

    // Isenção de R$20k (apenas swing trade, exceto FII e BDR)
    const applyExemption =
      !g.hasDayTrade && !NO_MONTHLY_EXEMPTION.has(classCode) && g.grossSales <= MONTHLY_EXEMPTION

    const profitAfterExemption = applyExemption ? 0 : profit

    // Compensação de prejuízo acumulado
    const prevLoss = lossBalance.get(classCode) ?? 0  // negativo = prejuízo
    let taxableBase: number
    let usedLoss: number

    if (profitAfterExemption > 0 && prevLoss < 0) {
      // Compensa prejuízo
      const available = Math.abs(prevLoss)
      usedLoss        = Math.min(profitAfterExemption, available)
      taxableBase     = profitAfterExemption - usedLoss
      lossBalance.set(classCode, prevLoss + usedLoss)
    } else if (profitAfterExemption <= 0) {
      // Acumula prejuízo
      usedLoss    = 0
      taxableBase = 0
      lossBalance.set(classCode, (prevLoss + profitAfterExemption))
    } else {
      usedLoss    = 0
      taxableBase = profitAfterExemption
    }

    const rate  = g.hasDayTrade ? DAY_TRADE_RATE : swingRate(classCode)
    const irDue = taxableBase > 0 ? taxableBase * rate : 0

    monthlyGains.push({
      month,
      classCode,
      className: g.className,
      hasDayTrade: g.hasDayTrade,
      grossSales: g.grossSales,
      costBasis: g.costBasis,
      profit,
      lossCarryIn: usedLoss,
      taxableBase,
      irDue,
      isExempt: applyExemption,
    })
  }

  // 7. Rendimentos (income_events do ano)
  const incomeEvents = await prisma.incomeEvent.findMany({
    where: {
      paymentDate: range,
      assetId: { not: null },
    },
    include: { asset: { include: { assetClass: true } } },
    orderBy: { paymentDate: 'asc' },
  })

  // Agrupa por ativo + tipo
  type IncomeKey = string // `assetId|type`
  type IncomeAgg = {
    ticker: string; assetName: string
    classCode: string; className: string
    type: string; totalGross: number
    paymentMonth: string
  }
  const incomeMap = new Map<IncomeKey, IncomeAgg>()

  for (const ev of incomeEvents) {
    if (!ev.asset) continue
    const assetId   = ev.assetId!
    const evType    = ev.type as string
    const key       = `${assetId}|${evType}`
    const gross     = Number(ev.amountPerUnit ?? 0)
    const cur       = incomeMap.get(key) ?? {
      ticker:       ev.asset.ticker,
      assetName:    ev.asset.name,
      classCode:    ev.asset.assetClass.code,
      className:    ev.asset.assetClass.name,
      type:         evType,
      totalGross:   0,
      paymentMonth: yyyymm(ev.paymentDate!),
    }
    cur.totalGross += gross
    incomeMap.set(key, cur)
  }

  const incomeRows: IncomeRow[] = Array.from(incomeMap.values()).map((r) => {
    const isJcp     = r.type === 'JCP'
    const isFii     = r.type === 'FII_INCOME'
    const irRate    = isJcp ? 0.15 : 0
    const irWithheld = r.totalGross * irRate
    return {
      ticker:       r.ticker,
      assetName:    r.assetName,
      classCode:    r.classCode,
      className:    r.className,
      type:         r.type,
      totalGross:   r.totalGross,
      irWithheld,
      netAmount:    r.totalGross - irWithheld,
      isExempt:     isFii || (!isJcp),
      paymentMonth: r.paymentMonth,
    }
  })

  // 8. Posições em 31/12 do ano (bens e direitos)
  const portfolioItems = await prisma.portfolioItem.findMany({
    include: { asset: { include: { assetClass: true } } },
  })

  const positions: PositionRow[] = portfolioItems.map((p) => {
    const qty  = Number(p.quantity)
    const avg  = Number(p.averagePrice)
    return {
      ticker:     p.asset.ticker,
      assetName:  p.asset.name,
      classCode:  p.asset.assetClass.code,
      className:  p.asset.assetClass.name,
      quantity:   qty,
      averageCost: avg,
      totalCost:  qty * avg,
      marketValue: Number(p.marketPrice) * qty,
    }
  })

  // 9. Monta DARFs
  const darfMap = new Map<string, DarfRow>()

  for (const g of monthlyGains) {
    if (g.irDue <= 0) continue
    const group = g.hasDayTrade ? 'Day Trade' : g.classCode === 'FII' ? 'FIIs' : 'Renda Variável'
    const key   = `${g.month}|${group}`
    const cur   = darfMap.get(key) ?? {
      month:        g.month,
      classGroup:   group,
      taxableBase:  0,
      irDue:        0,
      rate:         g.hasDayTrade ? DAY_TRADE_RATE : swingRate(g.classCode),
      dueDate:      lastDayNextMonth(g.month),
    }
    cur.taxableBase += g.taxableBase
    cur.irDue       += g.irDue
    darfMap.set(key, cur)
  }
  const darfs = Array.from(darfMap.values()).sort((a, b) => a.month.localeCompare(b.month))

  // 10. Totalizadores
  const totalGainSwing      = monthlyGains.filter((g) => !g.hasDayTrade).reduce((s, g) => s + g.profit, 0)
  const totalGainDayTrade   = monthlyGains.filter((g) =>  g.hasDayTrade).reduce((s, g) => s + g.profit, 0)
  const totalIrDue          = monthlyGains.reduce((s, g) => s + g.irDue, 0)
  const totalIrWithheld     = incomeRows.reduce((s, r) => s + r.irWithheld, 0)
  const totalExemptIncome   = incomeRows.filter((r) =>  r.isExempt).reduce((s, r) => s + r.netAmount, 0)
  const totalTaxableIncome  = incomeRows.filter((r) => !r.isExempt).reduce((s, r) => s + r.netAmount, 0)
  const lossCarryForward    = Array.from(lossBalance.values()).reduce((s, v) => s + Math.min(v, 0), 0)

  return {
    year,
    totalGainSwing,
    totalGainDayTrade,
    totalIrDue,
    totalIrWithheld,
    totalExemptIncome,
    totalTaxableIncome,
    lossCarryForward,
    monthlyGains,
    incomeRows,
    positions,
    darfs,
  }
}

/** Retorna o último dia do mês seguinte (vencimento simplificado da DARF) */
function lastDayNextMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  const nextMonth = m === 12 ? 1 : m + 1
  const nextYear  = m === 12 ? y + 1 : y
  const lastDay   = new Date(nextYear, nextMonth, 0).getDate()
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}
