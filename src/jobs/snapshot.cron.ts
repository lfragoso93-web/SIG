import cron from 'node-cron'
import { generateSnapshot, generateSnapshotRange } from '../modules/portfolio-snapshots/portfolio-snapshots.service'

/**
 * Cron de snapshots automáticos.
 *
 * WEEKLY  — toda sexta-feira às 18:00 (BRT = UTC-3 → 21:00 UTC)
 * DAILY   — seg a sex às 18:30 (BRT = UTC-3 → 21:30 UTC)
 *
 * O cron roda no fuso do servidor (container Docker usa UTC).
 * Ajustamos para UTC: 18:00 BRT = 21:00 UTC / 18:30 BRT = 21:30 UTC.
 */
export function startSnapshotCrons(): void {
  // ── WEEKLY: toda sexta-feira às 21:00 UTC ───────────────────────────────
  cron.schedule('0 21 * * 5', async () => {
    const today = new Date()
    console.log(`[cron:weekly] Gerando snapshot WEEKLY para ${today.toISOString().slice(0, 10)}`)
    try {
      const snap = await generateSnapshot(today, 'WEEKLY')
      console.log('[cron:weekly] OK —', snap ? `R$ ${snap.totalMarketValue}` : 'sem dados')
    } catch (err) {
      console.error('[cron:weekly] Erro:', err)
    }
  })

  // ── DAILY: seg–sex às 21:30 UTC ─────────────────────────────────────────
  cron.schedule('30 21 * * 1-5', async () => {
    const today = new Date()
    console.log(`[cron:daily] Gerando snapshot DAILY para ${today.toISOString().slice(0, 10)}`)
    try {
      const snap = await generateSnapshot(today, 'DAILY')
      if (snap === null) {
        console.log('[cron:daily] Feriado ou sem preços — snapshot pulado.')
      } else {
        console.log('[cron:daily] OK —', `R$ ${snap.totalMarketValue}`)
      }
    } catch (err) {
      console.error('[cron:daily] Erro:', err)
    }
  })

  console.log('[cron] Jobs de snapshot registrados (WEEKLY: sex 18h / DAILY: seg-sex 18h30 BRT)')
}

/**
 * Utilitário: popula snapshots DAILY de um intervalo inteiro.
 * Útil para backfill inicial após a feature entrar em produção.
 *
 * Uso:
 *   import { backfillDailySnapshots } from './jobs/snapshot.cron'
 *   await backfillDailySnapshots('2026-01-01', '2026-05-23')
 */
export async function backfillDailySnapshots(startDate: string, endDate: string) {
  return generateSnapshotRange(new Date(startDate), new Date(endDate), 'DAILY')
}
