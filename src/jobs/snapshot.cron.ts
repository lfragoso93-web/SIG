import cron from 'node-cron'
import { generateSnapshot, generateSnapshotRange } from '../modules/portfolio-snapshots/portfolio-snapshots.service'

/**
 * Crons de snapshots automáticos.
 *
 * WEEKLY  — toda sexta-feira às 18:00 BRT (21:00 UTC)
 * DAILY   — seg a sex às 18:30 BRT (21:30 UTC)
 * HOURLY  — seg a sex, a cada hora das 08:00 às 18:00 BRT (11:00–21:00 UTC)
 *           Garante snapshot atualizado ao longo do dia de negociação.
 *           Se já existe snapshot para o dia, o service faz upsert (não duplica).
 *
 * O container Docker usa UTC; BRT = UTC-3.
 */
export function startSnapshotCrons(): void {
  // ── WEEKLY: toda sexta-feira às 21:00 UTC ─────────────────────────────────
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

  // ── DAILY: seg–sex às 21:30 UTC ────────────────────────────────────────
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

  // ── HOURLY: seg–sex, hora cheia das 11:00 às 21:00 UTC (08h–18h BRT) ────────
  // Atualiza o snapshot do dia em tempo real durante o pregão.
  cron.schedule('0 11-21 * * 1-5', async () => {
    const now = new Date()
    const brtDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    console.log(`[cron:hourly] Atualizando snapshot DAILY para ${brtDate.toISOString().slice(0, 10)}`)
    try {
      const snap = await generateSnapshot(brtDate, 'DAILY')
      if (snap === null) {
        console.log('[cron:hourly] Sem preços disponíveis — pulado.')
      } else {
        console.log(`[cron:hourly] OK — R$ ${snap.totalMarketValue}`)
      }
    } catch (err) {
      console.error('[cron:hourly] Erro:', err)
    }
  })

  console.log('[cron] Jobs de snapshot registrados: WEEKLY(sex 18h) | DAILY(seg-sex 18h30) | HOURLY(seg-sex 08h-18h BRT)')
}

/**
 * Popula snapshots DAILY para um intervalo.
 * Útil para backfill inicial.
 *
 * Uso:
 *   import { backfillDailySnapshots } from './jobs/snapshot.cron'
 *   await backfillDailySnapshots('2026-01-01', '2026-05-29')
 */
export async function backfillDailySnapshots(startDate: string, endDate: string) {
  return generateSnapshotRange(new Date(startDate), new Date(endDate), 'DAILY')
}
