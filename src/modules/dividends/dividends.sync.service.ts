import { prisma } from '../../core/prisma/prisma.service'

const YAHOO_BASE   = 'https://query1.finance.yahoo.com/v8/finance/chart'
const TOLERANCE_MS = 4 * 24 * 60 * 60 * 1000

const toNum = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v) || 0
  return 0
}

interface YahooDividend {
  amount: number
  date:   number
}

async function fetchDividendsFromYahoo(ticker: string): Promise<YahooDividend[]> {
  const symbol = ticker.endsWith('.SA') ? ticker : `${ticker}.SA`
  const url    = `${YAHOO_BASE}/${symbol}?events=dividends&range=30y&interval=1mo`
  const res    = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status} para ${ticker}`)
  const json = await res.json() as {
    chart?: {
      result?: { events?: { dividends?: Record<string, YahooDividend> } }[]
      error?:  { description: string }
    }
  }
  if (json.chart?.error) throw new Error(`Yahoo Finance: ${json.chart.error.description}`)
  const divMap = json.chart?.result?.[0]?.events?.dividends ?? {}
  return Object.values(divMap)
}

async function quantityAtDate(assetId: string, date: Date): Promise<number> {
  const txs = await prisma.transaction.findMany({
    where: {
      assetId,
      tradeDate: { lte: date },
      type:      { in: ['BUY', 'SELL'] },
    },
    select: { type: true, quantity: true },
  })
  console.log(`[sync] quantityAtDate assetId=${assetId} date=${date.toISOString()} txs=${txs.length} qty=${txs.reduce((s,t) => t.type==='BUY'?s+toNum(t.quantity):s-toNum(t.quantity),0)}`)
  return txs.reduce((sum, tx) => {
    const q = toNum(tx.quantity)
    return tx.type === 'BUY' ? sum + q : sum - q
  }, 0)
}

export interface SyncResult {
  ticker:   string
  total:    number
  updated:  number
  notFound: number
  errors:   string[]
}

export async function syncDividendsForTicker(ticker: string): Promise<SyncResult> {
  const result: SyncResult = { ticker, total: 0, updated: 0, notFound: 0, errors: [] }

  const events = await prisma.incomeEvent.findMany({
    where: {
      asset:       { ticker },
      grossAmount: null,
      status:      { not: 'CANCELED' },
    },
    select: { id: true, paymentDate: true, assetId: true },
  })

  console.log(`[sync] ${ticker}: ${events.length} eventos sem grossAmount`)
  // Loga o tipo e valor do paymentDate do primeiro evento
  if (events[0]) {
    console.log(`[sync] paymentDate type=${typeof events[0].paymentDate} value=${JSON.stringify(events[0].paymentDate)}`)
  }

  result.total = events.length
  if (events.length === 0) return result

  let yahooDividends: YahooDividend[]
  try {
    yahooDividends = await fetchDividendsFromYahoo(ticker)
  } catch (e) {
    result.errors.push(String(e))
    return result
  }

  // Processa apenas os 3 mais recentes para debug
  const sample = events.slice(-3)
  for (const event of sample) {
    if (!event.paymentDate) { result.notFound++; continue }

    const payDate  = event.paymentDate instanceof Date
      ? event.paymentDate
      : new Date(event.paymentDate as unknown as string)

    const eventMs = payDate.getTime()
    console.log(`[sync] evento id=${event.id} payDate=${payDate.toISOString()} ms=${eventMs}`)

    const match = yahooDividends
      .map((d) => ({ d, diff: Math.abs(d.date * 1000 - eventMs) }))
      .filter(({ diff }) => diff <= TOLERANCE_MS)
      .sort((a, b) => a.diff - b.diff)[0]

    if (!match || match.d.amount === 0) {
      console.log(`[sync] sem match para ${payDate.toISOString()}`)
      result.notFound++
      continue
    }

    const rate     = match.d.amount
    const qty      = await quantityAtDate(event.assetId, payDate)
    const grossAmt = Number((rate * qty).toFixed(2))
    console.log(`[sync] rate=${rate} qty=${qty} grossAmt=${grossAmt}`)

    await prisma.incomeEvent.update({
      where: { id: event.id },
      data:  { grossAmount: grossAmt, netAmount: grossAmt },
    })
    result.updated++
  }

  // Processa o restante normalmente
  for (const event of events.filter(e => !sample.includes(e))) {
    if (!event.paymentDate) { result.notFound++; continue }
    const payDate  = event.paymentDate instanceof Date
      ? event.paymentDate
      : new Date(event.paymentDate as unknown as string)
    const eventMs  = payDate.getTime()
    const match    = yahooDividends
      .map((d) => ({ d, diff: Math.abs(d.date * 1000 - eventMs) }))
      .filter(({ diff }) => diff <= TOLERANCE_MS)
      .sort((a, b) => a.diff - b.diff)[0]
    if (!match || match.d.amount === 0) { result.notFound++; continue }
    const rate     = match.d.amount
    const qty      = await quantityAtDate(event.assetId, payDate)
    const grossAmt = Number((rate * qty).toFixed(2))
    await prisma.incomeEvent.update({
      where: { id: event.id },
      data:  { grossAmount: grossAmt, netAmount: grossAmt },
    })
    result.updated++
  }

  return result
}

export async function syncAllDividends(): Promise<SyncResult[]> {
  const rows = await prisma.incomeEvent.findMany({
    where:    { grossAmount: null, status: { not: 'CANCELED' } },
    select:   { asset: { select: { ticker: true } } },
    distinct: ['assetId'],
  })
  const tickers = [...new Set(rows.map((r) => r.asset.ticker))]
  const results: SyncResult[] = []
  for (const ticker of tickers) {
    results.push(await syncDividendsForTicker(ticker))
    await new Promise((res) => setTimeout(res, 300))
  }
  return results
}
