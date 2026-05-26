import cron   from 'node-cron'
import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '../core/prisma/prisma.service'
import { getMacroRates } from '../providers/brapi/brapi-rates.provider'

// ---------------------------------------------------------------------------
// Atualiza diariamente o marketValue e unrealizedPnL de todos os PortfolioItems
// de renda fixa privada (AssetClass.code = 'FIXED_INCOME'), aplicando o accrual
// juros compostos pelo indexador contratado com taxas reais da brapi.
//
// Roda seg-sex às 18:45 BRT — após o cron de preços (≤17:30) e antes do
// snapshot diário (18:30), garantindo que o snapshot capture o valor atualizado.
// ---------------------------------------------------------------------------

function calcAccrualSync(
  indexer: string,
  rate: number,
  principal: number,
  purchaseDate: Date,
  referenceDate: Date,
  cdi: number,
  selic: number,
  ipca: number,
): number {
  const calendarDays = Math.max(
    0,
    Math.floor((referenceDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)),
  )

  if (indexer === 'CDI' || indexer === 'SELIC') {
    const baseRate        = indexer === 'CDI' ? cdi : selic
    const effectiveAnnual = baseRate * rate
    return principal * Math.pow(1 + effectiveAnnual, calendarDays / 252)
  }

  if (indexer === 'IPCA' || indexer === 'IGPM') {
    const effectiveAnnual = ipca + rate
    return principal * Math.pow(1 + effectiveAnnual, calendarDays / 365)
  }

  // PREFIXADO
  return principal * Math.pow(1 + rate, calendarDays / 365)
}

export async function runFixedIncomeAccrual(): Promise<{
  updated: number
  skipped: number
  errors:  string[]
}> {
  const fiClass = await prisma.assetClass.findFirst({
    where: { code: 'FIXED_INCOME' },
  })

  if (!fiClass) {
    console.warn('[fi-accrual] AssetClass FIXED_INCOME não encontrada. Nada a fazer.')
    return { updated: 0, skipped: 0, errors: [] }
  }

  const items = await prisma.portfolioItem.findMany({
    where:   { asset: { assetClassId: fiClass.id, isActive: true } },
    include: { asset: true },
  })

  if (items.length === 0) {
    console.log('[fi-accrual] Nenhuma posição de renda fixa ativa.')
    return { updated: 0, skipped: 0, errors: [] }
  }

  // Busca taxas uma única vez para todo o lote (cache 1h reutilizado)
  const { cdi, selic, ipca } = await getMacroRates()

  const today   = new Date()
  let updated   = 0
  let skipped   = 0
  const errors: string[] = []

  for (const item of items) {
    try {
      const principal = Number(item.quantity)
      if (principal <= 0) { skipped++; continue }

      // Busca a transação de compra mais antiga para obter data e taxa contratada
      const firstBuy = await prisma.transaction.findFirst({
        where:   { assetId: item.assetId, type: 'BUY' },
        orderBy: { tradeDate: 'asc' },
        select:  { tradeDate: true, unitPrice: true },
      })

      const purchaseDate = firstBuy?.tradeDate ?? item.createdAt
      const rate         = firstBuy?.unitPrice
        ? Number(firstBuy.unitPrice)
        : Number(item.averagePrice ?? 0)

      const indexer = item.asset.indexer ?? 'CDI'

      const grossValue = calcAccrualSync(
        indexer, rate, principal,
        purchaseDate, today,
        cdi, selic, ipca,
      )

      const unrealizedPnL = grossValue - principal

      await prisma.portfolioItem.update({
        where: { id: item.id },
        data: {
          marketValue:   new Decimal(grossValue),
          unrealizedPnL: new Decimal(unrealizedPnL),
          lastUpdatedAt: today,
        },
      })

      console.log(
        `[fi-accrual] ${item.asset.ticker}: principal R$${principal.toFixed(2)} → bruto R$${grossValue.toFixed(2)} (rendimento R$${unrealizedPnL.toFixed(2)})`,
      )
      updated++
    } catch (err: unknown) {
      const msg = (err as Error).message
      console.error(`[fi-accrual] Erro em ${item.asset.ticker}: ${msg}`)
      errors.push(`${item.asset.ticker}: ${msg}`)
    }
  }

  console.log(`[fi-accrual] Concluído — updated: ${updated}, skipped: ${skipped}, errors: ${errors.length}`)
  return { updated, skipped, errors }
}

export function startFixedIncomeAccrualCron(): void {
  // 18:45 BRT — após price-import (≤17:30) e após snapshot diário (18:30)
  // Garante que o snapshot do dia seguinte já reflita o accrual atual
  cron.schedule('45 21 * * 1-5', () => {
    console.log('[fi-accrual] Iniciando accrual diário de renda fixa...')
    runFixedIncomeAccrual().catch(err =>
      console.error('[fi-accrual] Erro no cron:', err),
    )
  }, { timezone: 'America/Sao_Paulo' })

  console.log('[fi-accrual] Cron registrado — seg-sex 18:45 BRT')
}
