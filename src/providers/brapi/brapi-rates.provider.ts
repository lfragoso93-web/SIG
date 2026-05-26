/**
 * Provider de taxas macroeconômicas via brapi `/api/v2/prime-rate`.
 *
 * Retorna CDI, SELIC e IPCA anuais como decimais (ex: 0.1065 = 10,65% a.a.).
 * Cache em memória com TTL de 1 hora — as taxas do BCB são diárias.
 * Em caso de erro na API, retorna fallback conservador para não interromper o serviço.
 */

import axios from 'axios'

const BRAPI_BASE_URL = process.env.BRAPI_BASE_URL ?? 'https://brapi.dev/api'
const BRAPI_TOKEN    = process.env.BRAPI_TOKEN    ?? ''
const CACHE_TTL_MS   = 60 * 60 * 1000 // 1 hora

/** Taxas anuais como decimais */
export interface MacroRates {
  cdi:  number   // ex: 0.1065
  selic: number  // ex: 0.1075
  ipca: number   // ex: 0.0480 (acumulado 12m)
}

/** Fallback caso a brapi não responda */
const FALLBACK_RATES: MacroRates = {
  cdi:   0.1065,
  selic: 0.1075,
  ipca:  0.0480,
}

interface BrapiPrimeRateItem {
  name:  string
  value: string  // ex: "10.65"
}

interface BrapiPrimeRateResponse {
  prime: BrapiPrimeRateItem[]
}

let cache: { rates: MacroRates; fetchedAt: number } | null = null

function parseRate(value: string): number {
  const num = parseFloat(value.replace(',', '.'))
  return Number.isNaN(num) ? 0 : num / 100
}

function extractRate(
  items: BrapiPrimeRateItem[],
  ...names: string[]
): number | null {
  for (const name of names) {
    const found = items.find(i =>
      i.name.toLowerCase().includes(name.toLowerCase()),
    )
    if (found) return parseRate(found.value)
  }
  return null
}

export async function getMacroRates(): Promise<MacroRates> {
  const now = Date.now()

  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rates
  }

  try {
    const params: Record<string, string> = { country: 'brazil' }
    if (BRAPI_TOKEN) params.token = BRAPI_TOKEN

    const response = await axios.get<BrapiPrimeRateResponse>(
      `${BRAPI_BASE_URL}/v2/prime-rate`,
      { params, timeout: 10_000 },
    )

    const items = response.data?.prime ?? []

    const cdi  = extractRate(items, 'cdi')   ?? FALLBACK_RATES.cdi
    const selic = extractRate(items, 'selic') ?? FALLBACK_RATES.selic
    const ipca  = extractRate(items, 'ipca')  ?? FALLBACK_RATES.ipca

    const rates: MacroRates = { cdi, selic, ipca }
    cache = { rates, fetchedAt: now }

    console.info(
      `[rates-provider] CDI=${(cdi * 100).toFixed(2)}% SELIC=${(selic * 100).toFixed(2)}% IPCA=${(ipca * 100).toFixed(2)}% (brapi)`,
    )

    return rates
  } catch (err) {
    const message = (err as Error).message
    console.warn(
      `[rates-provider] Falha ao buscar taxas na brapi (${message}). Usando fallback: CDI=${(FALLBACK_RATES.cdi * 100).toFixed(2)}% a.a.`,
    )
    return FALLBACK_RATES
  }
}
