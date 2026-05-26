import { Decimal } from '@prisma/client/runtime/library'
import { prisma }  from '../../core/prisma/prisma.service'
import { radarOpcoesClient } from '../../providers/radaropcoes/radaropcoes.client'
import type { CreateTreasuryBondDto, UpdateTreasuryBondDto } from './treasury.schema'

// ---------------------------------------------------------------------------
// Constantes IR regressivo (Tesouro Direto)
// ---------------------------------------------------------------------------

const IR_TABLE = [
  { maxDays: 180,  rate: 0.225 },
  { maxDays: 360,  rate: 0.200 },
  { maxDays: 720,  rate: 0.175 },
  { maxDays: Infinity, rate: 0.150 },
]

// Tabela IOF regressiva dias 1-30 (percentual sobre o lucro)
const IOF_TABLE = [
  96, 93, 90, 86, 83, 80, 76, 73, 70, 66,
  63, 60, 56, 53, 50, 46, 43, 40, 36, 33,
  30, 26, 23, 20, 16, 13, 10,  6,  3,  0,
]

function calcIrRate(purchaseDate: Date, referenceDate: Date = new Date()): number {
  const days = Math.floor(
    (referenceDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24),
  )
  return IR_TABLE.find(t => days <= t.maxDays)!.rate
}

function calcIofRate(purchaseDate: Date, referenceDate: Date = new Date()): number {
  const days = Math.floor(
    (referenceDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (days <= 0)  return 1
  if (days >= 30) return 0
  return IOF_TABLE[days - 1] / 100
}

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

type PortfolioItemWithAsset = Awaited<
  ReturnType<typeof prisma.portfolioItem.findMany>
>[number]

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createTreasuryBond(dto: CreateTreasuryBondDto) {
  const treasuryClass = await prisma.assetClass.findFirstOrThrow({
    where: { code: 'TREASURY' },
  })

  const ticker = dto.bondName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  const asset = await prisma.asset.upsert({
    where:  { ticker },
    update: {},
    create: {
      ticker,
      name:         dto.bondName,
      assetType:    'BOND',
      assetClassId: treasuryClass.id,
      indexer:      dto.indexer,
      maturityDate: new Date(dto.maturityDate),
      currencyCode: 'BRL',
      isActive:     true,
    },
  })

  const grossAmount = new Decimal(dto.quantity).mul(dto.purchaseUnitValue)

  const transaction = await prisma.transaction.create({
    data: {
      assetId:     asset.id,
      accountId:   dto.accountId ?? null,
      type:        'BUY',
      tradeDate:   new Date(dto.purchaseDate),
      quantity:    new Decimal(dto.quantity),
      unitPrice:   new Decimal(dto.purchaseUnitValue),
      grossAmount,
      netAmount:   grossAmount,
      currencyCode: 'BRL',
      description: `Compra Tesouro Direto — ${dto.bondName} @ ${dto.purchaseRate}% a.a.`,
    },
  })

  const item = await prisma.portfolioItem.upsert({
    where: { assetId_accountId: { assetId: asset.id, accountId: dto.accountId ?? null } },
    update: {
      quantity:       { increment: new Decimal(dto.quantity) },
      investedAmount: { increment: grossAmount },
    },
    create: {
      assetId:        asset.id,
      accountId:      dto.accountId ?? null,
      quantity:       new Decimal(dto.quantity),
      averagePrice:   new Decimal(dto.purchaseUnitValue),
      investedAmount: grossAmount,
      marketValue:    grossAmount,
      unrealizedPnL:  new Decimal(0),
      realizedPnL:    new Decimal(0),
    },
  })

  return { asset, transaction, portfolioItem: item }
}

export async function listTreasuryBonds() {
  const treasuryClass = await prisma.assetClass.findFirstOrThrow({
    where: { code: 'TREASURY' },
  })

  const items = await prisma.portfolioItem.findMany({
    where:   { asset: { assetClassId: treasuryClass.id } },
    include: { asset: true },
    orderBy: { asset: { maturityDate: 'asc' } },
  })

  const result = await Promise.all(
    items.map(async (item: PortfolioItemWithAsset) => {
      const lastPrice = await prisma.priceHistory.findFirst({
        where:   { assetId: item.assetId },
        orderBy: { priceDate: 'desc' },
      })

      const qty            = Number(item.quantity)
      const investedAmount = Number(item.investedAmount)
      const redeemPrice    = lastPrice ? Number(lastPrice.closePrice) : null
      const marketValue    = redeemPrice !== null ? qty * redeemPrice : null
      const grossPnL       = marketValue !== null ? marketValue - investedAmount : null

      const purchaseDate = item.createdAt
      const irRate       = calcIrRate(purchaseDate)
      const iofRate      = calcIofRate(purchaseDate)
      const irAmount     = grossPnL !== null && grossPnL > 0
        ? grossPnL * (1 - iofRate) * irRate
        : 0
      const iofAmount    = grossPnL !== null && grossPnL > 0
        ? grossPnL * iofRate
        : 0
      const netPnL       = grossPnL !== null ? grossPnL - irAmount - iofAmount : null
      const netValue     = marketValue !== null ? marketValue - irAmount - iofAmount : null

      return {
        assetId:         item.assetId,
        bondName:        item.asset.name,
        ticker:          item.asset.ticker,
        indexer:         item.asset.indexer ?? null,
        maturityDate:    item.asset.maturityDate ?? null,
        accountId:       item.accountId ?? null,
        quantity:        qty,
        investedAmount,
        redeemUnitPrice: redeemPrice,
        marketValue,
        grossPnL,
        irRate,
        iofRate,
        irAmount,
        iofAmount,
        netPnL,
        netValue,
        lastPriceDate:   lastPrice?.priceDate ?? null,
      }
    }),
  )

  return result
}

export async function getTreasuryBond(assetId: string) {
  const items = await listTreasuryBonds()
  const item  = items.find((i: { assetId: string }) => i.assetId === assetId)
  if (!item) throw Object.assign(new Error('Título não encontrado.'), { status: 404 })
  return item
}

export async function updateTreasuryBond(assetId: string, dto: UpdateTreasuryBondDto) {
  const data: Record<string, unknown> = {}

  if (dto.indexer)               data.indexer      = dto.indexer
  if (dto.maturityDate)          data.maturityDate  = new Date(dto.maturityDate)
  if (dto.isActive !== undefined) data.isActive     = dto.isActive
  if (dto.bondName)              data.name          = dto.bondName

  return prisma.asset.update({ where: { id: assetId }, data })
}

export async function listAvailableBonds() {
  return radarOpcoesClient.listBonds()
}
