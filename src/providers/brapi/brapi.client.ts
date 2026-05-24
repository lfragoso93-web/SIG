import axios, { AxiosInstance } from 'axios'

export type BrapiRange =
  | '1d' | '2d' | '5d' | '7d'
  | '1mo' | '3mo' | '6mo'
  | '1y' | '2y' | '5y' | '10y'
  | 'ytd' | 'max'

export type BrapiInterval =
  | '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1h'
  | '1d' | '5d' | '1wk' | '1mo' | '3mo'

export interface GetHistoricalPricesParams {
  ticker:     string
  interval?:  BrapiInterval
  range?:     BrapiRange
  startDate?: string
  endDate?:   string
}

interface BrapiHistoricalRowRaw {
  date:          number | string
  open?:         number | null
  high?:         number | null
  low?:          number | null
  close?:        number | null
  adjustedClose?: number | null
  volume?:       number | null
}

interface BrapiQuoteResult {
  symbol:               string
  currency?:            string | null
  historicalDataPrice?: BrapiHistoricalRowRaw[]
  regularMarketPrice?:  number
}

interface BrapiQuoteResponse {
  results: BrapiQuoteResult[]
}

export interface BrapiHistoricalPriceRow {
  date:         string
  open:         number | null
  high:         number | null
  low:          number | null
  close:        number | null
  adjustedClose: number | null
  currencyCode: string
}

export interface BrapiCashDividend {
  assetIssued:  string
  paymentDate:  string
  rate:         number
  relatedTo:    string
  approvedOn:   string
  label:        string
  lastDatePrior: string
  remarks:      string
}

export class BrapiHttpError extends Error {
  public readonly status?:  number
  public readonly details?: unknown

  constructor(message: string, status?: number, details?: unknown) {
    super(message)
    this.name    = 'BrapiHttpError'
    this.status  = status
    this.details = details
  }
}

const buildParams = (
  input: GetHistoricalPricesParams,
): Record<string, string> => {
  const hasStartDate = !!input.startDate
  const hasEndDate   = !!input.endDate

  if (hasStartDate !== hasEndDate) {
    throw new Error('startDate e endDate devem ser informados juntos.')
  }

  const params: Record<string, string> = {
    interval: input.interval ?? '1d',
  }

  if (hasStartDate && hasEndDate) {
    params.startDate = input.startDate!
    params.endDate   = input.endDate!
  } else {
    params.range = input.range ?? '1y'
  }

  return params
}

const normalizeDate = (value: string | number): string => {
  if (typeof value === 'number') {
    return new Date(value * 1000).toISOString().slice(0, 10)
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

const toNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

class BrapiClient {
  private readonly http:      AxiosInstance
  private readonly yahooHttp: AxiosInstance
  private readonly token:     string

  constructor() {
    this.token = process.env.BRAPI_TOKEN ?? ''

    this.http = axios.create({
      baseURL: process.env.BRAPI_BASE_URL ?? 'https://brapi.dev/api',
      timeout: 30_000,
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    })

    this.yahooHttp = axios.create({
      baseURL: 'https://query1.finance.yahoo.com',
      timeout: 30_000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
  }

  async getHistoricalPrices(
    input: GetHistoricalPricesParams,
  ): Promise<BrapiHistoricalPriceRow[]> {
    const ticker = input.ticker.trim().toUpperCase()

    try {
      const params   = buildParams(input)
      const response = await this.http.get<BrapiQuoteResponse>(
        `/quote/${encodeURIComponent(ticker)}`,
        { params },
      )

      const result = response.data?.results?.[0]

      if (!result) {
        throw new BrapiHttpError(
          `Nenhum resultado para o ticker ${ticker}.`,
          response.status,
          response.data,
        )
      }

      const currencyCode = result.currency ?? 'BRL'

      return (result.historicalDataPrice ?? [])
        .map((row: BrapiHistoricalRowRaw) => ({
          date:         normalizeDate(row.date),
          open:         toNullableNumber(row.open),
          high:         toNullableNumber(row.high),
          low:          toNullableNumber(row.low),
          close:        toNullableNumber(row.close),
          adjustedClose: toNullableNumber(row.adjustedClose),
          currencyCode,
        }))
        .filter((row) => !!row.date && row.close !== null)
    } catch (error: unknown) {
      if (error instanceof BrapiHttpError) throw error
      const e = error as { message?: string; response?: { status?: number; data?: unknown } }
      throw new BrapiHttpError(
        `Erro ao consultar brapi para o ticker ${ticker}: ${e?.message}`,
        e?.response?.status,
        e?.response?.data,
      )
    }
  }

  /**
   * Busca cotação atual de múltiplos tickers B3.
   * Tenta batch primeiro (token na query string); se retornar 400,
   * faz fallback buscando ticker por ticker.
   */
  async getCurrentPrices(tickers: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>()
    if (tickers.length === 0) return prices

    // ── tentativa batch (chunks de 50) ──────────────────────────────────────
    const CHUNK_SIZE = 50
    const chunks: string[][] = []
    for (let i = 0; i < tickers.length; i += CHUNK_SIZE) {
      chunks.push(tickers.slice(i, i + CHUNK_SIZE))
    }

    const failedTickers: string[] = []

    for (const chunk of chunks) {
      try {
        const params: Record<string, string> = { fundamental: 'false' }
        if (this.token) params.token = this.token

        const response = await this.http.get<BrapiQuoteResponse>(
          `/quote/${chunk.map(t => encodeURIComponent(t)).join(',')}`,
          { params },
        )
        for (const result of response.data?.results ?? []) {
          const price = result.regularMarketPrice
          if (typeof price === 'number' && price > 0) {
            prices.set(result.symbol, price)
          }
        }
      } catch (error: unknown) {
        const e = error as { response?: { status?: number } }
        if (e?.response?.status === 400) {
          // batch rejeitado → enfileira para fallback individual
          failedTickers.push(...chunk)
        } else {
          const msg = (error as Error).message
          console.warn(`[brapi] Erro no batch [${chunk.join(',')}]: ${msg}`)
        }
      }
    }

    // ── fallback: um ticker por vez ──────────────────────────────────────────
    for (const ticker of failedTickers) {
      try {
        const params: Record<string, string> = { fundamental: 'false' }
        if (this.token) params.token = this.token

        const response = await this.http.get<BrapiQuoteResponse>(
          `/quote/${encodeURIComponent(ticker)}`,
          { params },
        )
        const result = response.data?.results?.[0]
        const price  = result?.regularMarketPrice
        if (typeof price === 'number' && price > 0) {
          prices.set(ticker, price)
        }
      } catch (error: unknown) {
        console.warn(`[brapi] Erro ao buscar ${ticker}: ${(error as Error).message}`)
      }
    }

    return prices
  }

  /**
   * Busca a cotação atual de um ativo internacional via Yahoo Finance.
   * Retorna null se o ticker não for encontrado ou ocorrer erro.
   */
  async getYahooCurrentPrice(ticker: string): Promise<number | null> {
    try {
      const response = await this.yahooHttp.get(
        `/v8/finance/chart/${encodeURIComponent(ticker)}`,
        { params: { interval: '1d', range: '1d' } },
      )
      const price = response.data?.chart?.result?.[0]?.meta?.regularMarketPrice
      return typeof price === 'number' && price > 0 ? price : null
    } catch {
      return null
    }
  }

  async getDividends(ticker: string): Promise<BrapiCashDividend[]> {
    const t           = ticker.trim().toUpperCase()
    const yahooTicker = `${t}.SA`

    try {
      const response = await this.yahooHttp.get(
        `/v8/finance/chart/${encodeURIComponent(yahooTicker)}`,
        { params: { interval: '1d', range: 'max', events: 'div' } },
      )

      const result = response.data?.chart?.result?.[0]
      if (!result) return []

      const rawDividends = (
        result.events?.dividends ?? {}
      ) as Record<string, { amount: number; date: number }>

      return Object.values(rawDividends).map((d) => {
        const dateStr = new Date(d.date * 1000).toISOString().slice(0, 10)
        return {
          assetIssued:   t,
          paymentDate:   dateStr,
          rate:          d.amount,
          relatedTo:     '',
          approvedOn:    dateStr,
          label:         'DIVIDENDO',
          lastDatePrior: dateStr,
          remarks:       '',
        }
      })
    } catch (error: unknown) {
      const e = error as { message?: string; response?: { status?: number; data?: unknown } }
      throw new BrapiHttpError(
        `Erro ao consultar dividendos no Yahoo Finance para ${t}: ${e?.message}`,
        e?.response?.status,
        e?.response?.data,
      )
    }
  }
}

export const brapiClient = new BrapiClient()
