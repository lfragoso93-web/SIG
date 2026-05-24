import { prisma } from '../../core/prisma/prisma.service'

const BRAPI_TOKEN = process.env.BRAPI_TOKEN ?? ''
const BRAPI_URL   = 'https://brapi.dev/api/quote'
const YAHOO_URL   = 'https://query1.finance.yahoo.com/v8/finance/chart'

// ─── helpers ──────────────────────────────────────────────────────────────────

function isBrazilian(currencyCode: string): boolean {
  return currencyCode === 'BRL'
}

function todayUTC(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

// ─── BRAPI (ativos B3) ────────────────────────────────────────────────────────

async function fetchBrapi(tickers: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>()
  if (tickers.length === 0) return prices

  // BRAPI aceita até 50 tickers por chamada
  const chunks = []
  for (let i = 0; i < tickers.length; i += 50) {
    chunks.push(tickers.slice(i, i + 50))
  }

  for (const chunk of chunks) {
    const url = `${BRAPI_URL}/${chunk.join(',')}?token=${BRAPI_TOKEN}&fundamental=false`
    const res  = await fetch(url)
    if (!res.ok) {
      console.warn(`[price-import] BRAPI erro ${res.status} para ${chunk.join(',')}`)
      continue
    }
    const data = await res.json() as { results?: { symbol: string; regularMarketPrice: number }[] }
    for (const item of data.results ?? []) {
      if (item.regularMarketPrice) {
        prices.set(item.symbol, item.regularMarketPrice)
      }
    }
  }
  return prices
}

// ─── Yahoo Finance (ativos internacionais) ────────────────────────────────────

async function fetchYahoo(ticker: string): Promise<number | null> {
  try {
    const url = `${YAHOO_URL}/${ticker}?interval=1d&range=1d`
    const res  = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) return null
    const data = await res.json() as any
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
    return typeof price === 'number' ? price : null
  } catch {
    return null
  }
}

// ─── upsert no banco ──────────────────────────────────────────────────────────

async function upsertPrice(assetId: string, closePrice: number, priceDate: Date) {
  await prisma.priceHistory.upsert({
    where:  { assetId_priceDate: { assetId, priceDate } },
    update: { closePrice },
    create: { assetId, priceDate, closePrice },
  })
}

// ─── função principal ─────────────────────────────────────────────────────────

export async function importCurrentPrices(): Promise<{
  updated: number
  skipped: number
  errors:  string[]
}> {
  const today  = todayUTC()
  const assets = await prisma.asset.findMany({
    where: { isActive: true },
    select: { id: true, ticker: true, currencyCode: true },
  })

  const brAssets  = assets.filter(a => isBrazilian(a.currencyCode))
  const intAssets = assets.filter(a => !isBrazilian(a.currencyCode))

  let updated = 0
  let skipped = 0
  const errors: string[] = []

  // ── B3 (batch) ──────────────────────────────────────────────────────────────
  const brPrices = await fetchBrapi(brAssets.map(a => a.ticker))
  for (const asset of brAssets) {
    const price = brPrices.get(asset.ticker)
    if (price == null) { skipped++; continue }
    try {
      await upsertPrice(asset.id, price, today)
      updated++
    } catch (err) {
      errors.push(`${asset.ticker}: ${(err as Error).message}`)
    }
  }

  // ── Internacionais (individual, Yahoo não tem batch gratuito) ───────────────
  for (const asset of intAssets) {
    const price = await fetchYahoo(asset.ticker)
    if (price == null) { skipped++; continue }
    try {
      await upsertPrice(asset.id, price, today)
      updated++
    } catch (err) {
      errors.push(`${asset.ticker}: ${(err as Error).message}`)
    }
  }

  return { updated, skipped, errors }
}