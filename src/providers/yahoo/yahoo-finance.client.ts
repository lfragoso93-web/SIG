const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'
const HEADERS    = { 'User-Agent': 'Mozilla/5.0' }

export interface YahooHistoricalRow {
  date:          string   // 'YYYY-MM-DD'
  open:          number | null
  high:          number | null
  low:           number | null
  close:         number
  adjustedClose: number | null
  currencyCode:  string
}

export interface FetchPricesInput {
  ticker:     string
  startDate?: string   // 'YYYY-MM-DD'
  endDate?:   string   // 'YYYY-MM-DD'
}

function toSymbol(ticker: string): string {
  return ticker.endsWith('.SA') ? ticker : `${ticker}.SA`
}

function dateToUnix(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00.000Z`).getTime() / 1000)
}

export async function fetchPriceHistory(
  input: FetchPricesInput,
): Promise<YahooHistoricalRow[]> {
  const symbol = toSymbol(input.ticker)

  const period1 = input.startDate
    ? dateToUnix(input.startDate)
    : dateToUnix('2000-01-01')

  const period2 = input.endDate
    ? dateToUnix(input.endDate) + 86400   // inclui o dia final
    : Math.floor(Date.now() / 1000)

  const url = `${YAHOO_BASE}/${symbol}?interval=1d&period1=${period1}&period2=${period2}&events=history`

  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status} para ${input.ticker}`)

  const json = await res.json() as {
    chart?: {
      result?: {
        meta:       { currency?: string }
        timestamp:  number[]
        indicators: {
          quote:    { open: (number|null)[]; high: (number|null)[]; low: (number|null)[]; close: (number|null)[] }[]
          adjclose: { adjclose: (number|null)[] }[]
        }
      }[]
      error?: { description: string }
    }
  }

  if (json.chart?.error) throw new Error(`Yahoo Finance: ${json.chart.error.description}`)

  const result = json.chart?.result?.[0]
  if (!result) return []

  const timestamps  = result.timestamp ?? []
  const quote       = result.indicators.quote[0]
  const adjCloses   = result.indicators.adjclose?.[0]?.adjclose ?? []
  const currency    = result.meta.currency ?? 'BRL'

  const rows: YahooHistoricalRow[] = []

  for (let i = 0; i < timestamps.length; i++) {
    const close = quote.close[i]
    if (close == null) continue

    const date = new Date(timestamps[i] * 1000)
    const dateStr = date.toISOString().slice(0, 10)

    rows.push({
      date:          dateStr,
      open:          quote.open[i]  ?? null,
      high:          quote.high[i]  ?? null,
      low:           quote.low[i]   ?? null,
      close,
      adjustedClose: adjCloses[i]   ?? null,
      currencyCode:  currency,
    })
  }

  return rows
}
