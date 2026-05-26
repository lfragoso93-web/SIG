import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '../../core/prisma/prisma.service'
import type { CreateFixedIncomeDto, RedeemFixedIncomeDto } from './fixed-income.schema'

// ---------------------------------------------------------------------------
// Tabelas IR regressivo (mesmas do Tesouro — válidas para renda fixa privada)
// ---------------------------------------------------------------------------
const IR_TABLE = [
  { maxDays: 180,      rate: 0.225 },
  { maxDays: 360,      rate: 0.200 },
  { maxDays: 720,      rate: 0.175 },
  { maxDays: Infinity, rate: 0.150 },
]

const IOF_TABLE = [
  96, 93, 90, 86, 83, 80, 76, 73, 70, 66,
  63, 60, 56, 53, 50, 46, 43, 40, 36, 33,
  30, 26, 23, 20, 16, 13, 10,  6,  3,  0,
]

function calcIrRate(purchaseDate: Date, referenceDate: Date): number {
  const days = Math.floor(
    (referenceDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24),
  )
  return (IR_TABLE.find(t => days <= t.maxDays) ?? IR_TABLE[IR_TABLE.length - 1]).rate
}

function calcIofRate(purchaseDate: Date, referenceDate: Date): number {
  const days = Math.floor(
    (referenceDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (days <= 0)  return 1
  if (days >= 30) return 0
  return IOF_TABLE[days - 1] / 100
}

// ---------------------------------------------------------------------------
// Accrual diário — calcula o valor bruto acumulado até referenceDate
//
// Fórmula (regime 252 dias úteis para CDI/SELIC, 365 corridos para prefixado/IPCA):
//   CDI/SELIC : valorBruto = principal × (1 + rate × CDI_diario) ^ diasUteis
//   Prefixado  : valorBruto = principal × (1 + taxaAnual) ^ (diasCorridos / 365)
//   IPCA+      : simplificado como prefixado com taxa bruta (IPCA + spread)
//
// Observação: CDI_diario não é consumido de API externa nesta versão.  
// Usamos a aproximação conservadora: CDI ≈ SELIC meta (hardcoded 10,5% a.a.).  
// O campo `rate` para CDI representa o percentual do CDI (ex: 1.15 = 115% CDI).  
// ---------------------------------------------------------------------------

const CDI_ANNUAL_APPROX = 0.105  // ~10,5% a.a. — atualizar conforme BACEN

function calcAccrual(
  indexer: string,
  rate: number,
  principal: number,
  purchaseDate: Date,
  referenceDate: Date,
): number {
  const calendarDays = Math.max(
    0,
    Math.floor((referenceDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)),
  )

  if (indexer === 'CDI' || indexer === 'SELIC') {
    // rate = percentual do CDI (ex: 1.15 para 115% CDI)
    // Aproximação: (1 + CDI_anual × percentual) ^ (dias / 252)
    // Usamos dias corridos / 252 como proxy de dias úteis
    const effectiveAnnual = CDI_ANNUAL_APPROX * rate
    const factor = Math.pow(1 + effectiveAnnual, calendarDays / 252)
    return principal * factor
  }

  // IPCA, PREFIXADO, IGPM — taxa a.a., capitalização contínua em 365 dias
  const factor = Math.pow(1 + rate, calendarDays / 365)
  return principal * factor
}

// ---------------------------------------------------------------------------
// Helpers de produto
// ---------------------------------------------------------------------------

/** LCI, LCA, CRI e CRA são isentos de IR */
function isIrExempt(productType: string): boolean {
  return ['LCI', 'LCA', 'CRI', 'CRA'].includes(productType)
}

/** CDB, LCI, LCA possuem cobertura FGC */
function hasFgc(productType: string): boolean {
  return ['CDB', 'LCI', 'LCA', 'LF'].includes(productType)
}

/** Gera um ticker único: <TIPO>-<ISSUER_SLUG>-<DATA> */
function buildTicker(productType: string, issuer: string, purchaseDate: string): string {
  const slug = issuer.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const date = purchaseDate.replace(/-/g, '')
  return `${productType.toLowerCase()}-${slug}-${date}`
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createFixedIncome(dto: CreateFixedIncomeDto) {
  const fiClass = await prisma.assetClass.findFirstOrThrow({
    where: { code: 'FIXED_INCOME' },
  })

  const ticker    = buildTicker(dto.productType, dto.issuer, dto.purchaseDate)
  const accountId = dto.accountId ?? null
  const irExempt  = isIrExempt(dto.productType)
  const fgcProtected = hasFgc(dto.productType)

  const asset = await prisma.asset.upsert({
    where:  { ticker },
    update: {},
    create: {
      ticker,
      name:          dto.name,
      assetType:     'BOND',
      assetClassId:  fiClass.id,
      issuer:        dto.issuer,
      indexer:       dto.indexer,
      maturityDate:  new Date(dto.maturityDate),
      currencyCode:  'BRL',
      fgcProtected,
      irExempt,
      liquidityDays: dto.liquidityDays ?? null,
      isActive:      true,
      notes:         `${dto.productType} | Taxa: ${dto.rate} | ${dto.indexer}`,
    },
  })

  // quantity = principal investido | unitPrice = taxa contratada
  const transaction = await prisma.transaction.create({
    data: {
      assetId:      asset.id,
      accountId,
      type:         'BUY',
      tradeDate:    new Date(dto.purchaseDate),
      quantity:     new Decimal(dto.principal),
      unitPrice:    new Decimal(dto.rate),
      grossAmount:  new Decimal(dto.principal),
      netAmount:    new Decimal(dto.principal),
      currencyCode: 'BRL',
      description:  `Aplicação ${dto.productType} — ${dto.name}`,
    },
  })

  const grossValue = calcAccrual(dto.indexer, dto.rate, dto.principal, new Date(dto.purchaseDate), new Date())

  const existing = await prisma.portfolioItem.findFirst({
    where: { assetId: asset.id, accountId },
  })

  const item = existing
    ? await prisma.portfolioItem.update({
        where: { id: existing.id },
        data: {
          quantity:       { increment: new Decimal(dto.principal) },
          investedAmount: { increment: new Decimal(dto.principal) },
          averagePrice:   new Decimal(dto.rate),
          marketValue:    new Decimal(grossValue),
        },
      })
    : await prisma.portfolioItem.create({
        data: {
          assetId:        asset.id,
          accountId,
          quantity:       new Decimal(dto.principal),
          averagePrice:   new Decimal(dto.rate),
          investedAmount: new Decimal(dto.principal),
          marketValue:    new Decimal(grossValue),
          unrealizedPnL:  new Decimal(grossValue - dto.principal),
          realizedPnL:    new Decimal(0),
        },
      })

  return { asset, transaction, portfolioItem: item }
}

export async function listFixedIncome() {
  const fiClass = await prisma.assetClass.findFirstOrThrow({
    where: { code: 'FIXED_INCOME' },
  })

  const items = await prisma.portfolioItem.findMany({
    where:   { asset: { assetClassId: fiClass.id, isActive: true } },
    include: { asset: true },
    orderBy: { asset: { maturityDate: 'asc' } },
  })

  const today = new Date()

  return Promise.all(
    items.map(async item => {
      const firstBuy = await prisma.transaction.findFirst({
        where:   { assetId: item.assetId, type: 'BUY' },
        orderBy: { tradeDate: 'asc' },
        select:  { tradeDate: true, quantity: true, unitPrice: true },
      })

      const principal    = Number(item.quantity)
      const rate         = firstBuy?.unitPrice ? Number(firstBuy.unitPrice) : Number(item.averagePrice ?? 0)
      const purchaseDate = firstBuy?.tradeDate ?? item.createdAt
      const indexer      = item.asset.indexer ?? 'CDI'
      const irExempt     = item.asset.irExempt

      const grossValue  = calcAccrual(indexer, rate, principal, purchaseDate, today)
      const grossPnL    = grossValue - principal

      const irRate  = irExempt ? 0 : calcIrRate(purchaseDate, today)
      const iofRate = calcIofRate(purchaseDate, today)

      const gain      = grossPnL > 0 ? grossPnL : 0
      const iofAmount = gain * iofRate
      const irAmount  = (gain - iofAmount) * irRate
      const netPnL    = grossPnL - iofAmount - irAmount
      const netValue  = principal + netPnL

      const calendarDays = Math.floor(
        (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24),
      )

      return {
        assetId:       item.assetId,
        name:          item.asset.name,
        ticker:        item.asset.ticker,
        productType:   item.asset.notes?.split(' | ')[0] ?? 'CDB',
        issuer:        item.asset.issuer ?? null,
        indexer,
        rate,
        principal,
        grossValue,
        grossPnL,
        purchaseDate:  purchaseDate.toISOString().slice(0, 10),
        maturityDate:  item.asset.maturityDate?.toISOString().slice(0, 10) ?? null,
        calendarDays,
        irExempt,
        fgcProtected:  item.asset.fgcProtected,
        liquidityDays: item.asset.liquidityDays ?? null,
        irRate,
        iofRate,
        irAmount,
        iofAmount,
        netPnL,
        netValue,
        accountId:     item.accountId ?? null,
      }
    }),
  )
}

export async function getFixedIncome(assetId: string) {
  const items = await listFixedIncome()
  const item  = items.find(i => i.assetId === assetId)
  if (!item) throw Object.assign(new Error('Investimento não encontrado.'), { status: 404 })
  return item
}

/**
 * Resgate parcial ou total de renda fixa.
 *
 * Fluxo:
 *  1. Valida que o investimento existe e o valor solicitado é possível.
 *  2. Calcula o valor bruto acumulado via accrual.
 *  3. Aplica IR (regressivo, se não isento) e IOF.
 *  4. Cria transação SELL.
 *  5. Atualiza PortfolioItem (reduz quantity/investedAmount proporcionalmente).
 *  6. Arquiva o Asset se saldo zerado.
 */
export async function redeemFixedIncome(assetId: string, dto: RedeemFixedIncomeDto) {
  const portfolioItem = await prisma.portfolioItem.findFirst({
    where:   { assetId },
    include: { asset: true },
  })

  if (!portfolioItem) {
    throw Object.assign(new Error('Investimento não encontrado.'), { status: 404 })
  }

  const redeemDate   = dto.redeemDate ? new Date(dto.redeemDate) : new Date()
  const principal    = Number(portfolioItem.quantity)   // principal total na posição
  const indexer      = portfolioItem.asset.indexer ?? 'CDI'
  const irExempt     = portfolioItem.asset.irExempt

  const firstBuy = await prisma.transaction.findFirst({
    where:   { assetId, type: 'BUY' },
    orderBy: { tradeDate: 'asc' },
    select:  { tradeDate: true, unitPrice: true },
  })

  const purchaseDate = firstBuy?.tradeDate ?? portfolioItem.createdAt
  const rate         = firstBuy?.unitPrice ? Number(firstBuy.unitPrice) : Number(portfolioItem.averagePrice ?? 0)

  // Valor bruto total acumulado até a data de resgate
  const grossValueTotal = calcAccrual(indexer, rate, principal, purchaseDate, redeemDate)

  // Proporção do resgate (resgate parcial por valor bruto)
  const redeemGross     = dto.amount ?? grossValueTotal
  if (redeemGross > grossValueTotal + 0.01) {
    throw Object.assign(
      new Error(`Valor solicitado (${redeemGross}) excede o saldo bruto disponível (${grossValueTotal.toFixed(2)}).`),
      { status: 422 },
    )
  }

  const proportion      = redeemGross / grossValueTotal   // fração resgatada
  const principalPart   = principal * proportion          // parcela do principal
  const grossPnL        = redeemGross - principalPart

  // IR e IOF
  const irRate  = irExempt ? 0 : calcIrRate(purchaseDate, redeemDate)
  const iofRate = calcIofRate(purchaseDate, redeemDate)

  const gain        = grossPnL > 0 ? grossPnL : 0
  const iofAmount   = gain * iofRate
  const irAmount    = (gain - iofAmount) * irRate
  const netPnL      = grossPnL - iofAmount - irAmount
  const netProceeds = redeemGross - iofAmount - irAmount

  // Saldo remanescente
  const newPrincipal   = principal - principalPart
  const positionClosed = newPrincipal < 0.01

  const [sellTx] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        assetId,
        accountId:    portfolioItem.accountId,
        type:         'SELL',
        tradeDate:    redeemDate,
        quantity:     new Decimal(principalPart),
        unitPrice:    new Decimal(rate),
        grossAmount:  new Decimal(redeemGross),
        netAmount:    new Decimal(netProceeds),
        currencyCode: 'BRL',
        description:  `Resgate ${portfolioItem.asset.name}`,
      },
    }),

    prisma.portfolioItem.update({
      where: { id: portfolioItem.id },
      data: {
        quantity:       new Decimal(positionClosed ? 0 : newPrincipal),
        investedAmount: new Decimal(positionClosed ? 0 : newPrincipal),
        realizedPnL:    { increment: new Decimal(netPnL) },
        marketValue:    new Decimal(
          positionClosed ? 0 : calcAccrual(indexer, rate, newPrincipal, purchaseDate, redeemDate),
        ),
      },
    }),

    ...(positionClosed
      ? [prisma.asset.update({ where: { id: assetId }, data: { isActive: false } })]
      : []),
  ])

  return {
    assetId,
    name:              portfolioItem.asset.name,
    redeemDate:        redeemDate.toISOString().slice(0, 10),
    principalRedeemed: principalPart,
    principalRemaining: positionClosed ? 0 : newPrincipal,
    grossProceeds:     redeemGross,
    grossPnL,
    irExempt,
    irRate,
    iofRate,
    iofAmount,
    irAmount,
    netPnL,
    netProceeds,
    positionClosed,
    transactionId:     sellTx.id,
  }
}
