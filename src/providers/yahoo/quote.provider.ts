import https from 'https'
import axios from 'axios'

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export interface QuoteResult {
  symbol:      string
  longname:    string
  shortname:   string
  quoteType:   string   // 'EQUITY' | 'ETF' | ...
  industry:    string
  exchDisp:    string
  isBrazilian: boolean  // true quando o símbolo termina em .SA OU veio da Brapi
}

// ─── Brapi ────────────────────────────────────────────────────────────────────

interface BrapiSearchResult {
  stock:     string
  name:      string
  type:      string   // 'stock' | 'fund' | 'bdr' | 'etf'
  close?:    number
}

interface BrapiSearchResponse {
  stocks: BrapiSearchResult[]
}

const brapiHttp = axios.create({
  baseURL: process.env.BRAPI_BASE_URL ?? 'https://brapi.dev/api',
  timeout: 8_000,
  headers: process.env.BRAPI_TOKEN
    ? { Authorization: `Bearer ${process.env.BRAPI_TOKEN}` }
    : {},
})

async function fetchFromBrapi(ticker: string): Promise<QuoteResult | null> {
  try {
    // Brapi /api/quote/list?search=<ticker> retorna lista de ativos com correspondência
    const res = await brapiHttp.get<BrapiSearchResponse>('/quote/list', {
      params: { search: ticker, limit: 10 },
    })

    const stocks: BrapiSearchResult[] = res.data?.stocks ?? []
    if (stocks.length === 0) return null

    // Correspondência exata pelo ticker
    const match = stocks.find(
      (s) => s.stock.toUpperCase() === ticker.toUpperCase(),
    )
    if (!match) return null

    const type = (match.type ?? '').toLowerCase()

    // Mapeia type da Brapi para quoteType do Yahoo (para reusar inferAssetClass)
    let quoteType = 'EQUITY'
    if (type === 'etf' || type === 'etf_fund') quoteType = 'ETF'

    // Detecta FII pelo type
    const isFII   = type === 'fund' || type === 'fii'
    const industry = isFII ? 'REIT' : ''

    return {
      symbol:      match.stock,
      longname:    match.name ?? match.stock,
      shortname:   match.name ?? match.stock,
      quoteType,
      industry,
      exchDisp:    'B3',
      isBrazilian: true,
    }
  } catch {
    return null
  }
}

// ─── Yahoo Finance (fallback) ─────────────────────────────────────────────────

function searchYahoo(query: string): Promise<QuoteResult | null> {
  return new Promise((resolve) => {
    const url =
      `https://query1.finance.yahoo.com/v1/finance/search` +
      `?q=${encodeURIComponent(query)}&quotesCount=5&newsCount=0`

    const options = {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    }

    https
      .get(url, options, (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => {
          try {
            const data   = JSON.parse(body)
            const quotes: any[] = data?.quotes ?? []

            // Correspondência exata: compara sem .SA de ambos os lados
            const base  = query.replace(/\.SA$/i, '').toUpperCase()
            const match = quotes.find((q) => {
              const sym = String(q.symbol ?? '').toUpperCase().replace(/\.SA$/i, '')
              return sym === base
            })

            if (!match) return resolve(null)

            const isBrazilian = String(match.symbol ?? '').toUpperCase().endsWith('.SA')

            resolve({
              symbol:      match.symbol ?? query,
              longname:    match.longname  ?? match.shortname ?? '',
              shortname:   match.shortname ?? '',
              quoteType:   String(match.quoteType ?? '').toUpperCase(),
              industry:    match.industry  ?? match.industryDisp ?? '',
              exchDisp:    match.exchDisp  ?? '',
              isBrazilian,
            })
          } catch {
            resolve(null)
          }
        })
      })
      .on('error', () => resolve(null))
  })
}

async function fetchFromYahoo(ticker: string): Promise<QuoteResult | null> {
  // Tenta o ticker puro primeiro; se não achar, tenta com .SA
  // (internacionais como AAPL não têm .SA; brasileiros como PETR4 aparecem como PETR4.SA no Yahoo)
  const result = await searchYahoo(ticker)
  if (result) return result

  // Segunda tentativa com .SA — Yahoo indexa tickers BR assim
  if (!ticker.endsWith('.SA')) {
    return searchYahoo(`${ticker}.SA`)
  }

  return null
}

// ─── Entrada pública ──────────────────────────────────────────────────────────

/**
 * Busca metadados de um ativo para o drawer de novo lançamento.
 *
 * Estratégia:
 *   1. Brapi /quote/list?search=<ticker>  — ticker B3 sem .SA
 *   2. Yahoo Finance /v1/finance/search    — fallback para internacionais / não-B3
 *
 * Retorna null se nenhuma fonte encontrar o ticker.
 */
export async function fetchQuote(rawTicker: string): Promise<QuoteResult | null> {
  const ticker = rawTicker.trim().toUpperCase()

  const brapi = await fetchFromBrapi(ticker)
  if (brapi) return brapi

  return fetchFromYahoo(ticker)
}

// ─── Inferência de classe ─────────────────────────────────────────────────────

/**
 * Infere a classe do ativo a partir dos metadados normalizados.
 *
 * Retorna uma string que corresponde ao campo `name` das asset-classes no banco:
 *   'Fundo Imobiliário' | 'ETF Nacional' | 'ETF Internacional'
 *   'Ação Nacional'     | 'Ação Internacional'
 *
 * Retorna null quando não é possível inferir — o frontend exibe o select manual.
 */
export function inferAssetClass(q: QuoteResult): string | null {
  const industry  = q.industry.toLowerCase()
  const longname  = q.longname.toLowerCase()
  const quoteType = q.quoteType

  // 1. Fundo Imobiliário
  const isFII =
    industry.includes('reit') ||
    longname.includes('imobili') ||
    longname.includes('fundo de investimento imobili')

  if (isFII) return 'Fundo Imobiliário'

  // 2. ETF
  if (quoteType === 'ETF' || longname.includes('index fund') || longname.includes('etf')) {
    return q.isBrazilian ? 'ETF Nacional' : 'ETF Internacional'
  }

  // 3. EQUITY B3
  if (quoteType === 'EQUITY' && q.isBrazilian) {
    if (
      longname.includes('ishares') ||
      longname.includes('index fund') ||
      longname.includes('investimento no exterior')
    ) {
      if (longname.includes('investimento no exterior')) return 'ETF Internacional'
      return 'ETF Nacional'
    }
    return 'Ação Nacional'
  }

  // 4. EQUITY internacional
  if (quoteType === 'EQUITY' && !q.isBrazilian) {
    return 'Ação Internacional'
  }

  return null
}

// ─── Retrocompatibilidade (outros módulos que ainda importam yahoo.client) ────
/** @deprecated Use fetchQuote() */
export const fetchYahooQuote = fetchQuote
