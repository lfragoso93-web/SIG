import cron    from 'node-cron'
import { prisma } from '../core/prisma/prisma.service'
import { radarOpcoesClient } from '../providers/radaropcoes/radaropcoes.client'

// ---------------------------------------------------------------------------
// Importa preços diários dos títulos do Tesouro Direto via radaropcoes.com
// Salva em PriceHistory:
//   closePrice  = unitaryRedemptionValue  (valor de resgate — usado para P&L)
//   openPrice   = unitaryInvestmentValue  (valor de compra no dia)
//   source      = 'radaropcoes'
// ---------------------------------------------------------------------------

export async function importTreasuryPrices(): Promise<{
  updated: number
  skipped: number
  errors:  string[]
}> {
  const treasuryClass = await prisma.assetClass.findFirst({
    where: { code: 'TREASURY' },
  })

  if (!treasuryClass) {
    console.warn('[treasury-import] AssetClass TREASURY não encontrada. Nada a fazer.')
    return { updated: 0, skipped: 0, errors: [] }
  }

  const assets = await prisma.asset.findMany({
    where: { assetClassId: treasuryClass.id, assetType: 'BOND', isActive: true },
  })

  if (assets.length === 0) {
    console.log('[treasury-import] Nenhum título ativo cadastrado.')
    return { updated: 0, skipped: 0, errors: [] }
  }

  const today   = new Date()
  const dateStr = today.toISOString().slice(0, 10)

  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (const asset of assets) {
    try {
      const existing = await prisma.priceHistory.findUnique({
        where: { assetId_priceDate: { assetId: asset.id, priceDate: new Date(dateStr) } },
      })

      if (existing) {
        skipped++
        continue
      }

      const bond = await radarOpcoesClient.getBond(asset.name)

      await prisma.priceHistory.create({
        data: {
          assetId:      asset.id,
          priceDate:    new Date(dateStr),
          openPrice:    bond.unitaryInvestmentValue,
          closePrice:   bond.unitaryRedemptionValue,
          currencyCode: 'BRL',
          source:       'radaropcoes',
        },
      })

      await prisma.portfolioItem.updateMany({
        where: { assetId: asset.id },
        data:  {
          marketPrice:   bond.unitaryRedemptionValue,
          lastUpdatedAt: today,
        },
      })

      console.log(
        `[treasury-import] ${asset.name}: resgate R$ ${bond.unitaryRedemptionValue} | compra R$ ${bond.unitaryInvestmentValue}`,
      )
      updated++
    } catch (err: unknown) {
      const msg = (err as Error).message
      console.error(`[treasury-import] Erro em ${asset.name}: ${msg}`)
      errors.push(`${asset.name}: ${msg}`)
    }
  }

  console.log(`[treasury-import] Concluído — updated: ${updated}, skipped: ${skipped}, errors: ${errors.length}`)
  return { updated, skipped, errors }
}

export function startTreasuryCron(): void {
  cron.schedule('0 22 * * 1-5', () => {
    console.log('[treasury-import] Iniciando importação de preços do Tesouro Direto...')
    importTreasuryPrices().catch(err =>
      console.error('[treasury-import] Erro no cron:', err),
    )
  }, { timezone: 'America/Sao_Paulo' })

  console.log('[treasury-import] Cron registrado — seg-sex 19:00 BRT')
}
