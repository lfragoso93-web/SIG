import cron from 'node-cron'
import { importIncomeEventsBatch } from '../modules/income-events/income-events.service'

/**
 * Importa proventos (dividendos, JCP, rendimentos de FII) de todos os ativos
 * ativos da carteira via Yahoo Finance.
 *
 * Usa o mesmo mecanismo do endpoint POST /income-events/import/batch,
 * com skipDuplicates — seguro para rodar múltiplas vezes.
 */
export async function importAllIncomeEvents(): Promise<{
  inserted: number
  skipped:  number
  errors:   number
  details:  { ticker: string; inserted: number; skipped: number; error?: string }[]
}> {
  const result = await importIncomeEventsBatch()

  return {
    inserted: result.summary.inserted,
    skipped:  result.summary.skipped,
    errors:   result.summary.errors,
    details:  result.results.map(r => ({
      ticker:   r.ticker,
      inserted: r.inserted,
      skipped:  r.skipped,
      ...(r.error ? { error: r.error } : {}),
    })),
  }
}

/**
 * Registra 1 cron semanal:
 *   Domingo 06:00 BRT (09:00 UTC) → '0 9 * * 0'
 *
 * Roda fora do pregão para não competir com o cron de preços.
 * O Yahoo Finance não tem restrição de horário para dividendos históricos.
 */
export function startIncomeCron(): void {
  cron.schedule('0 9 * * 0', async () => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    console.log(`[cron:income] Importando proventos — ${now} UTC`)
    try {
      const result = await importAllIncomeEvents()
      console.log(
        `[cron:income] inserted=${result.inserted} skipped=${result.skipped} errors=${result.errors}`,
      )
      if (result.errors > 0) {
        const failed = result.details.filter(d => d.error)
        console.warn('[cron:income] Falhas:', failed)
      }
    } catch (err) {
      console.error('[cron:income] Falha geral:', err)
    }
  })

  console.log('[cron] Importação de proventos registrada (domingo 06:00 BRT)')
}
