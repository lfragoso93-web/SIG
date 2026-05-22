import { prisma } from '../../core/prisma/prisma.service'

const YAHOO_BASE   = 'https://query1.finance.yahoo.com/v8/finance/chart'
const TOLERANCE_MS = 4 * 24 * 60 * 60 * 1000 // 4 dias em ms

const toNum = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v) || 0
  return 0
}

interface YahooDividend {
  amount: number
  date:   number // Unix timestamp (segundos)
}

async function fetchDividendsFromYahoo(ticker: string): Promise<YahooDividend[]> {
  // B3 tickers precisam do sufixo .SA
  const symbol = ticker.endsWith('.SA') ? ticker : `${ticker}.SA`
  const url = `${YAHOO_BASE}/${symbol}?events=dividends&range=30y&interval=1mo`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status} para ${ticker}`)

  const json = await res.json() as {
    chart?: {
      result?: { events?: { dividends?: Record<string, YahooDividend> } }[]
      error?:  { description: string }
    }
  }

  if (json.chart?.error) {
    throw new Error(`Yahoo Finance erro: ${json.chart.error.description}`)
  }

  const divMap = json.chart?.result?.[0]?.events?.dividends ?? {}
  return Object.values(divMap)
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

  // Busca apenas IncomeEvents sem valor
  const events = await prisma.incomeEvent.findMany({
    where: {
      asset:       { ticker },
      grossAmount: null,
      status:      { not: 'CANCELED' },
    },
    select: { id: true, paymentDate: true },
  })

  result.total = events.length
  if (events.length === 0) return result

  let yahooDividends: YahooDividend[]
  try {
    yahooDividends = await fetchDividendsFromYahoo(ticker)
  } catch (e) {
    result.errors.push(String(e))
    return result
  }

  for (const event of events) {
    if (!event.paymentDate) { result.notFound++; continue }

    const eventMs = new Date(event.paymentDate).getTime()

    // Encontra o dividendo do Yahoo mais próximo pela data (tolerância de 4 dias)
    const match = yahooDividends
      .map((d) => ({ d, diff: Math.abs(d.date * 1000 - eventMs) }))
      .filter(({ diff }) => diff <= TOLERANCE_MS)
      .sort((a, b) => a.diff - b.diff)[0]

    if (!match || match.d.amount === 0) {
      result.notFound++
      continue
    }

    const grossAmount = match.d.amount

    await prisma.incomeEvent.update({
      where: { id: event.id },
      data:  { grossAmount, netAmount: grossAmount },
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
    const r = await syncDividendsForTicker(ticker)
    results.push(r)
    await new Promise((res) => setTimeout(res, 300))
  }

  return results
}
