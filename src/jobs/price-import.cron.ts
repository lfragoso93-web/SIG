import cron from 'node-cron'
import { prisma } from '../core/prisma/prisma.service'
import { brapiClient } from '../providers/brapi/brapi.client'

function todayUTC(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/**
 * Importa a cotação atual de todos os ativos ativos.
 * - Ativos BRL → BRAPI (batch, até 50 tickers por chamada)
 * - Ativos não-BRL → Yahoo Finance (individual)
 *
 * Faz upsert em PriceHistory para a data de hoje (UTC).
 */
export async function importCurrentPrices(): Promise<{
  updated: number
  skipped: number
  errors:  string[]
}> {
  const today  = todayUTC()
  const assets = await prisma.asset.findMany({
    where:  { isActive: true },
    select: { id: true, ticker: true, currencyCode: true },
  })

  const brAssets  = assets.filter(a => a.currencyCode === 'BRL')
  const intAssets = assets.filter(a => a.currencyCode !== 'BRL')

  let updated = 0
  let skipped = 0
  const errors: string[] = []

  // ── B3 — batch via BRAPI ──────────────────────────────────────────────────
  const brPrices = await brapiClient.getCurrentPrices(brAssets.map(a => a.ticker))

  for (const asset of brAssets) {
    const price = brPrices.get(asset.ticker)
    if (price == null) { skipped++; continue }
    try {
      await prisma.priceHistory.upsert({
        where:  { assetId_priceDate: { assetId: asset.id, priceDate: today } },
        update: { closePrice: price },
        create: {
          assetId:      asset.id,
          priceDate:    today,
          closePrice:   price,
          currencyCode: 'BRL',
          source:       'BRAPI',
        },
      })
      updated++
    } catch (err) {
      errors.push(`${asset.ticker}: ${(err as Error).message}`)
    }
  }

  // ── Internacionais — individual via Yahoo Finance ─────────────────────────
  for (const asset of intAssets) {
    const price = await brapiClient.getYahooCurrentPrice(asset.ticker)
    if (price == null) { skipped++; continue }
    try {
      await prisma.priceHistory.upsert({
        where:  { assetId_priceDate: { assetId: asset.id, priceDate: today } },
        update: { closePrice: price },
        create: {
          assetId:      asset.id,
          priceDate:    today,
          closePrice:   price,
          currencyCode: asset.currencyCode,
          source:       'YAHOO',
        },
      })
      updated++
    } catch (err) {
      errors.push(`${asset.ticker}: ${(err as Error).message}`)
    }
  }

  return { updated, skipped, errors }
}

/**
 * Registra 5 crons por dia em horário de pregão (BRT = UTC-3):
 *
 * 10:00 BRT → 13:00 UTC  →  '0 13 * * 1-5'
 * 11:30 BRT → 14:30 UTC  →  '30 14 * * 1-5'
 * 13:00 BRT → 16:00 UTC  →  '0 16 * * 1-5'
 * 15:00 BRT → 18:00 UTC  →  '0 18 * * 1-5'
 * 17:30 BRT → 20:30 UTC  →  '30 20 * * 1-5'
 */
export function startPriceCron(): void {
  const schedules = [
    '0 13 * * 1-5',
    '30 14 * * 1-5',
    '0 16 * * 1-5',
    '0 18 * * 1-5',
    '30 20 * * 1-5',
  ]

  for (const schedule of schedules) {
    cron.schedule(schedule, async () => {
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
      console.log(`[cron:price] Importando preços — ${now} UTC`)
      try {
        const result = await importCurrentPrices()
        console.log(
          `[cron:price] updated=${result.updated} skipped=${result.skipped} errors=${result.errors.length}`,
        )
        if (result.errors.length > 0) {
          console.warn('[cron:price] Erros:', result.errors)
        }
      } catch (err) {
        console.error('[cron:price] Falha geral:', err)
      }
    })
  }

  console.log('[cron] Importação de preços registrada (5x/dia, seg–sex, 10h–17h30 BRT)')
}
