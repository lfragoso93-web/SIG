import { prisma } from '../../core/prisma/prisma.service'

const BRAPI_BASE = 'https://brapi.dev/api'
const TOLERANCE_DAYS = 3

const toNum = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v) || 0
  return 0
}

function daysDiff(a: Date, b: Date): number {
  return Math.abs((a.getTime() - b.getTime()) / 86_400_000)
}

interface BrapiDividend {
  paymentDate:  string
  rate:         number
  type?:        string
  declarationDate?: string
  relatedTo?:   string
}

async function fetchDividendsFromBrapi(ticker: string): Promise<BrapiDividend[]> {
  const url = `${BRAPI_BASE}/quote/${ticker}?modules=dividends&fundamental=true`
  const res  = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`brapi HTTP ${res.status} para ${ticker}`)

  const json = await res.json() as {
    results?: { dividendsData?: { cashDividends?: BrapiDividend[] } }[]
  }

  return json.results?.[0]?.dividendsData?.cashDividends ?? []
}

export interface SyncResult {
  ticker:    string
  total:     number
  updated:   number
  notFound:  number
  errors:    string[]
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

  let brapiDividends: BrapiDividend[]
  try {
    brapiDividends = await fetchDividendsFromBrapi(ticker)
  } catch (e) {
    result.errors.push(String(e))
    return result
  }

  for (const event of events) {
    if (!event.paymentDate) { result.notFound++; continue }

    const eventDate = new Date(event.paymentDate)

    // Tenta casar pelo paymentDate (tolerância de TOLERANCE_DAYS dias)
    const match = brapiDividends.find((d) => {
      if (!d.paymentDate) return false
      const brapiDate = new Date(d.paymentDate)
      return daysDiff(eventDate, brapiDate) <= TOLERANCE_DAYS
    })

    if (!match) {
      result.notFound++
      continue
    }

    const grossAmount = toNum(match.rate)
    if (grossAmount === 0) { result.notFound++; continue }

    await prisma.incomeEvent.update({
      where: { id: event.id },
      data:  { grossAmount, netAmount: grossAmount },
    })

    result.updated++
  }

  return result
}

export async function syncAllDividends(): Promise<SyncResult[]> {
  // Busca tickers distintos com IncomeEvents sem valor
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
    // Pequena pausa para não sobrecarregar a brapi
    await new Promise((res) => setTimeout(res, 300))
  }

  return results
}
