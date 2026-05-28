import https from 'https'

export interface YahooQuoteResult {
  symbol:    string
  longname:  string
  shortname: string
  quoteType: string    // 'EQUITY' | 'ETF' | 'MUTUALFUND' | ...
  industry:  string    // 'REIT—Diversified' etc.
  exchDisp:  string    // 'São Paulo' | 'NASDAQ' | ...
  isBrazilian: boolean
}

/**
 * Usa o endpoint público /v1/finance/search do Yahoo Finance.
 * Não requer autenticação e não é afetado por CORS (roda no servidor).
 */
export async function fetchYahooQuote(rawTicker: string): Promise<YahooQuoteResult | null> {
  const ticker = rawTicker.trim().toUpperCase()

  // Tentativas: primeiro com sufixo .SA, depois sem (internacionais)
  const candidates = ticker.endsWith('.SA')
    ? [ticker]
    : [`${ticker}.SA`, ticker]

  for (const symbol of candidates) {
    const result = await searchYahoo(symbol)
    if (result) return result
  }

  return null
}

function searchYahoo(query: string): Promise<YahooQuoteResult | null> {
  return new Promise((resolve) => {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=5&newsCount=0`

    const options = {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    }

    https
      .get(url, options, (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => {
          try {
            const data = JSON.parse(body)
            const quotes: any[] = data?.quotes ?? []

            // Busca correspondência exata pelo símbolo (com ou sem .SA)
            const base = query.replace(/\.SA$/i, '').toUpperCase()
            const match = quotes.find((q) => {
              const sym = String(q.symbol ?? '').toUpperCase().replace(/\.SA$/i, '')
              return sym === base
            })

            if (!match) return resolve(null)

            resolve({
              symbol:      match.symbol ?? query,
              longname:    match.longname  ?? match.shortname ?? '',
              shortname:   match.shortname ?? '',
              quoteType:   String(match.quoteType ?? '').toUpperCase(),
              industry:    match.industry  ?? match.industryDisp ?? '',
              exchDisp:    match.exchDisp  ?? '',
              isBrazilian: String(match.symbol ?? '').toUpperCase().endsWith('.SA'),
            })
          } catch {
            resolve(null)
          }
        })
      })
      .on('error', () => resolve(null))
  })
}

/**
 * Infere a classe do ativo a partir dos metadados do Yahoo.
 *
 * Retorna uma string que bate com o campo `name` de asset-classes no banco:
 *   'Fundo Imobiliário' | 'ETF Nacional' | 'ETF Internacional'
 *   'Ação Nacional'     | 'Ação Internacional'
 *
 * Retorna null quando não é possível inferir com confiança
 * (ex.: quoteType desconhecido) — nesse caso o frontend exibe o select manual.
 */
export function inferAssetClass(q: YahooQuoteResult): string | null {
  const industry  = q.industry.toLowerCase()
  const longname  = q.longname.toLowerCase()
  const quoteType = q.quoteType  // já em UPPER

  // 1. Fundo Imobiliário
  //    - industry contém 'reit'
  //    - ou longname contém 'imobili' (imobiliário / imobiliaro — typo no Yahoo)
  //    - ou longname contém 'fundo de investimento imobili'
  const isFII =
    industry.includes('reit') ||
    longname.includes('imobili') ||
    longname.includes('fundo de investimento imobili')

  if (isFII) return 'Fundo Imobiliário'

  // 2. ETF
  if (quoteType === 'ETF' || longname.includes('index fund') || longname.includes('etf')) {
    return q.isBrazilian ? 'ETF Nacional' : 'ETF Internacional'
  }

  // 3. EQUITY brasileiro negociado na B3
  if (quoteType === 'EQUITY' && q.isBrazilian) {
    // ETFs de renda variável listados como EQUITY na B3
    // ex.: BOVA11 (iShares Ibovespa), IVVB11 (S&P 500)
    if (
      longname.includes('ishares') ||
      longname.includes('index fund') ||
      longname.includes('investimento no exterior')
    ) {
      // "Investimento No Exterior" → ETF Internacional
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
