import { Decimal } from '@prisma/client/runtime/library'
import { prisma }  from '../../core/prisma/prisma.service'
import { radarOpcoesClient } from '../../providers/radaropcoes/radaropcoes.client'
import type { CreateTreasuryBondDto, UpdateTreasuryBondDto, RedeemTreasuryBondDto } from './treasury.schema'
import { Prisma } from '@prisma/client'

// ---------------------------------------------------------------------------
// Tabelas IR e IOF regressivos (Tesouro Direto)
// ---------------------------------------------------------------------------

const IR_TABLE = [
  { maxDays: 180,      rate: 0.225 },
  { maxDays: 360,      rate: 0.200 },
  { maxDays: 720,      rate: 0.175 },
  { maxDays: Infinity, rate: 0.150 },
]

// IOF_TABLE[i] = alíquota IOF (%) para o dia i+1 após a compra (dias 1..30)
const IOF_TABLE = [
  96, 93, 90, 86, 83, 80, 76, 73, 70, 66,
  63, 60, 56, 53, 50, 46, 43, 40, 36, 33,
  30, 26, 23, 20, 16, 13, 10,  6,  3,  0,
]

/**
 * Calcula a alíquota de IR regressivo com base no número de dias corridos
 * desde a data de compra mais antiga (FIFO) até a data de referência.
 */
function calcIrRate(firstPurchaseDate: Date, referenceDate: Date = new Date()): number {
  const days = Math.floor(
    (referenceDate.getTime() - firstPurchaseDate.getTime()) / (1000 * 60 * 60 * 24),
  )
  return (IR_TABLE.find(t => days <= t.maxDays) ?? IR_TABLE[IR_TABLE.length - 1]).rate
}

/**
 * Calcula a alíquota de IOF com base no número de dias corridos.
 * - Dia 0    : 100% (compra e resgate no mesmo dia)
 * - Dias 1-29: tabela regressiva
 * - Dia 30+  : isento (0%)
 */
function calcIofRate(firstPurchaseDate: Date, referenceDate: Date = new Date()): number {
  const days = Math.floor(
    (referenceDate.getTime() - firstPurchaseDate.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (days <= 0)  return 1
  if (days >= 30) return 0
  return IOF_TABLE[days - 1] / 100
}

/**
 * Calcula o custo médio ponderado (WAVG) e a quantidade atual
 * percorrendo todas as transações BUY/SELL de um ativo em ordem cronológica.
 */
async function calcWavg(assetId: string): Promise<{ avgCost: number; totalQty: number }> {
  const allTxs = await prisma.transaction.findMany({
    where:   { assetId, type: { in: ['BUY', 'SELL'] } },
    orderBy: { tradeDate: 'asc' },
    select:  { type: true, quantity: true, unitPrice: true },
  })

  let avgCost  = 0
  let totalQty = 0

  for (const tx of allTxs) {
    const qty   = Math.abs(Number(tx.quantity))
    const price = Number(tx.unitPrice)

    if (tx.type === 'BUY') {
      avgCost  = (avgCost * totalQty + price * qty) / (totalQty + qty)
      totalQty = totalQty + qty
    } else {
      totalQty = Math.max(0, totalQty - qty)
    }
  }

  return { avgCost, totalQty }
}

// ---------------------------------------------------------------------------
// Tipo explícito com include para garantir que .asset esteja disponível
// ---------------------------------------------------------------------------

const portfolioItemWithAsset = Prisma.validator<Prisma.PortfolioItemDefaultArgs>()({
  include: { asset: true },
})
type PortfolioItemWithAsset = Prisma.PortfolioItemGetPayload<typeof portfolioItemWithAsset>

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

  const accountId: string | null = dto.accountId ?? null

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
      assetId:      asset.id,
      accountId,
      type:         'BUY',
      tradeDate:    new Date(dto.purchaseDate),
      quantity:     new Decimal(dto.quantity),
      unitPrice:    new Decimal(dto.purchaseUnitValue),
      grossAmount,
      netAmount:    grossAmount,
      currencyCode: 'BRL',
      description:  `Compra Tesouro Direto — ${dto.bondName} @ ${dto.purchaseRate}% a.a.`,
    },
  })

  const existing = await prisma.portfolioItem.findFirst({
    where: { assetId: asset.id, accountId },
  })

  const item = existing
    ? await prisma.portfolioItem.update({
        where: { id: existing.id },
        data: {
          quantity:       { increment: new Decimal(dto.quantity) },
          investedAmount: { increment: grossAmount },
          averagePrice:   new Decimal(dto.purchaseUnitValue),
        },
      })
    : await prisma.portfolioItem.create({
        data: {
          assetId:        asset.id,
          accountId,
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

  const items: PortfolioItemWithAsset[] = await prisma.portfolioItem.findMany({
    where:   { asset: { assetClassId: treasuryClass.id } },
    include: { asset: true },
    orderBy: { asset: { maturityDate: 'asc' } },
  })

  const result = await Promise.all(
    items.map(async (item: PortfolioItemWithAsset) => {

      const firstBuy = await prisma.transaction.findFirst({
        where:   { assetId: item.assetId, type: 'BUY' },
        orderBy: { tradeDate: 'asc' },
        select:  { tradeDate: true },
      })

      const { avgCost, totalQty } = await calcWavg(item.assetId)
      const investedAmount = avgCost * totalQty

      const lastPrice = await prisma.priceHistory.findFirst({
        where:   { assetId: item.assetId },
        orderBy: { priceDate: 'desc' },
      })

      const qty         = Number(item.quantity)
      const redeemPrice = lastPrice ? Number(lastPrice.closePrice) : null
      const marketValue = redeemPrice !== null ? qty * redeemPrice : null
      const grossPnL    = marketValue !== null ? marketValue - investedAmount : null

      const purchaseDate = firstBuy?.tradeDate ?? item.createdAt
      const today        = new Date()
      const irRate       = calcIrRate(purchaseDate, today)
      const iofRate      = calcIofRate(purchaseDate, today)

      const gain      = grossPnL !== null && grossPnL > 0 ? grossPnL : 0
      const iofAmount = gain * iofRate
      const irAmount  = (gain - iofAmount) * irRate
      const netPnL    = grossPnL !== null ? grossPnL - iofAmount - irAmount : null
      const netValue  = marketValue !== null && netPnL !== null
        ? investedAmount + netPnL
        : null

      return {
        assetId:         item.assetId,
        bondName:        item.asset.name,
        ticker:          item.asset.ticker,
        indexer:         item.asset.indexer  ?? null,
        maturityDate:    item.asset.maturityDate ?? null,
        accountId:       item.accountId ?? null,
        quantity:        qty,
        investedAmount,
        redeemUnitPrice: redeemPrice,
        marketValue,
        grossPnL,
        purchaseDate:    purchaseDate.toISOString().slice(0, 10),
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
  const item  = items.find(i => i.assetId === assetId)
  if (!item) throw Object.assign(new Error('Título não encontrado.'), { status: 404 })
  return item
}

export async function updateTreasuryBond(assetId: string, dto: UpdateTreasuryBondDto) {
  const data: Record<string, unknown> = {}

  if (dto.indexer)                data.indexer     = dto.indexer
  if (dto.maturityDate)           data.maturityDate = new Date(dto.maturityDate)
  if (dto.isActive !== undefined) data.isActive    = dto.isActive
  if (dto.bondName)               data.name        = dto.bondName

  return prisma.asset.update({ where: { id: assetId }, data })
}

/**
 * Registra o resgate (parcial ou total) de um título do Tesouro Direto.
 *
 * Fluxo:
 *  1. Valida a posição e a quantidade solicitada.
 *  2. Resolve o PU de resgate (parâmetro ou último closePrice).
 *  3. Calcula o P&L realizado com IR (FIFO) e IOF.
 *  4. Cria transação SELL.
 *  5. Atualiza PortfolioItem: reduz quantity, recalcula investedAmount e realizedPnL.
 *  6. Arquiva a posição (isActive = false) se quantity = 0.
 */
export async function redeemTreasuryBond(assetId: string, dto: RedeemTreasuryBondDto) {
  // ------------------------------------------------------------------
  // 1. Carregar posição atual
  // ------------------------------------------------------------------
  const portfolioItem = await prisma.portfolioItem.findFirst({
    where:   { assetId },
    include: { asset: true },
  })

  if (!portfolioItem) {
    throw Object.assign(new Error('Posição não encontrada.'), { status: 404 })
  }

  const currentQty = Number(portfolioItem.quantity)

  if (dto.quantity > currentQty) {
    throw Object.assign(
      new Error(`Quantidade solicitada (${dto.quantity}) excede a posição atual (${currentQty}).`),
      { status: 422 },
    )
  }

  // ------------------------------------------------------------------
  // 2. Resolver PU de resgate
  // ------------------------------------------------------------------
  let redeemUnitPrice = dto.redeemUnitPrice

  if (!redeemUnitPrice) {
    const lastPrice = await prisma.priceHistory.findFirst({
      where:   { assetId },
      orderBy: { priceDate: 'desc' },
    })

    if (!lastPrice) {
      throw Object.assign(
        new Error('Nenhum preço disponível. Informe redeemUnitPrice manualmente.'),
        { status: 422 },
      )
    }

    redeemUnitPrice = Number(lastPrice.closePrice)
  }

  // ------------------------------------------------------------------
  // 3. Calcular custo médio ponderado (WAVG) das cotas a resgatar
  // ------------------------------------------------------------------
  const { avgCost } = await calcWavg(assetId)

  const redeemDate  = dto.redeemDate ? new Date(dto.redeemDate) : new Date()
  const grossProceeds = dto.quantity * redeemUnitPrice
  const costBasis     = avgCost * dto.quantity
  const grossPnL      = grossProceeds - costBasis

  // ------------------------------------------------------------------
  // 4. IR (FIFO) e IOF
  // ------------------------------------------------------------------
  const firstBuy = await prisma.transaction.findFirst({
    where:   { assetId, type: 'BUY' },
    orderBy: { tradeDate: 'asc' },
    select:  { tradeDate: true },
  })

  const purchaseDate = firstBuy?.tradeDate ?? portfolioItem.createdAt
  const irRate  = calcIrRate(purchaseDate, redeemDate)
  const iofRate = calcIofRate(purchaseDate, redeemDate)

  const gain      = grossPnL > 0 ? grossPnL : 0
  const iofAmount = gain * iofRate
  const irAmount  = (gain - iofAmount) * irRate
  const netPnL    = grossPnL - iofAmount - irAmount
  const netProceeds = grossProceeds - iofAmount - irAmount

  // ------------------------------------------------------------------
  // 5. Persistência em transação atômica
  // ------------------------------------------------------------------
  const newQty        = currentQty - dto.quantity
  const positionClosed = newQty === 0

  const [sellTx] = await prisma.$transaction([
    // Cria a transação de venda
    prisma.transaction.create({
      data: {
        assetId,
        accountId:   portfolioItem.accountId,
        type:        'SELL',
        tradeDate:   redeemDate,
        quantity:    new Decimal(dto.quantity),
        unitPrice:   new Decimal(redeemUnitPrice),
        grossAmount: new Decimal(grossProceeds),
        netAmount:   new Decimal(netProceeds),
        currencyCode: 'BRL',
        description: `Resgate Tesouro Direto — ${portfolioItem.asset.name}`,
      },
    }),

    // Atualiza o PortfolioItem
    prisma.portfolioItem.update({
      where: { id: portfolioItem.id },
      data: {
        quantity:       new Decimal(newQty),
        investedAmount: new Decimal(avgCost * newQty),
        realizedPnL:    { increment: new Decimal(netPnL) },
        marketValue:    new Decimal(newQty * redeemUnitPrice),
        isActive:       positionClosed ? false : true,
      },
    }),

    // Arquiva o Asset se a posição foi zerada
    ...(positionClosed
      ? [prisma.asset.update({
          where: { id: assetId },
          data:  { isActive: false },
        })]
      : []),
  ])

  return {
    assetId,
    bondName:          portfolioItem.asset.name,
    quantityRedeemed:  dto.quantity,
    quantityRemaining: newQty,
    redeemUnitPrice,
    grossProceeds,
    costBasis,
    grossPnL,
    irRate,
    iofRate,
    irAmount,
    iofAmount,
    netPnL,
    netProceeds,
    positionClosed,
    transactionId: sellTx.id,
  }
}

/**
 * Lista os títulos disponíveis no Tesouro Direto via RadarOpcoes.
 */
export async function listAvailableBonds() {
  return radarOpcoesClient.listBonds()
}
