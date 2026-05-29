import { AssetType, Prisma } from '@prisma/client'
import { prisma } from '../../core/prisma/prisma.service'

// ----------------------------------------------------------------
// Regra de identificação para Tesouro Direto:
// Se assetType = BOND e issuer = 'Tesouro Nacional', o ticker é
// gerado automaticamente no formato TESOURO-{INDEXER}-{ANO}.
// Para os demais ativos, ticker continua obrigatório.
// ----------------------------------------------------------------

const TESOURO_ISSUER = 'Tesouro Nacional'

function buildTesourTicker(indexer: string, maturityDate: string | Date): string {
  const year = new Date(maturityDate).getFullYear()
  const normalizedIndexer = String(indexer).trim().toUpperCase()
    .replace(/\+/g, '')   // IPCA+ → IPCA
    .replace(/\s+/g, '-') // espaços → hífen
  return `TESOURO-${normalizedIndexer}-${year}`
}

function isTesouroDireto(assetType: string, issuer?: string): boolean {
  return (
    String(assetType).toUpperCase() === 'BOND' &&
    String(issuer ?? '').trim() === TESOURO_ISSUER
  )
}

type CreateAssetInput = {
  ticker?: string
  name: string
  assetClassId: string
  assetType: string
  // campos gerais opcionais
  isin?: string
  currencyCode?: string
  exchange?: string
  sector?: string
  segment?: string
  issuer?: string
  isActive?: boolean
  notes?: string
  // campos Tesouro Direto / renda fixa
  maturityDate?: string | Date
  indexer?: string
}

type UpdateAssetInput = {
  name?: string
  normalizedName?: string
  assetType?: string
  assetClassId?: string
  isin?: string
  currencyCode?: string
  exchange?: string
  sector?: string
  segment?: string
  issuer?: string
  isActive?: boolean
  notes?: string
  maturityDate?: string | Date
  indexer?: string
}

export class AssetsService {
  async listAll() {
    return prisma.asset.findMany({
      orderBy: [{ ticker: 'asc' }],
      include: { assetClass: true },
    })
  }

  async findByTicker(ticker: string) {
    return prisma.asset.findUnique({
      where: { ticker },
      include: { assetClass: true },
    })
  }

  async create(data: CreateAssetInput) {
    const isTesouro = isTesouroDireto(data.assetType, data.issuer)

    // Para Tesouro Direto, indexer e maturityDate são obrigatórios
    if (isTesouro) {
      if (!data.indexer || !data.maturityDate) {
        throw new Error(
          'Para Tesouro Direto (BOND + Tesouro Nacional), os campos indexer e maturityDate são obrigatórios.',
        )
      }
    }

    // ticker: gerado automaticamente para Tesouro Direto, obrigatório nos demais
    const ticker = isTesouro
      ? buildTesourTicker(data.indexer!, data.maturityDate!)
      : data.ticker

    if (!ticker) {
      throw new Error('O campo ticker é obrigatório para ativos que não são Tesouro Direto.')
    }

    // Verifica se o ticker já existe antes de tentar criar (evita P2002 genérico)
    const existing = await prisma.asset.findUnique({ where: { ticker } })
    if (existing) {
      throw new Error(
        `O ativo "${ticker}" já está cadastrado. Use-o diretamente ou edite-o na tela de Ativos.`,
      )
    }

    try {
      return await prisma.asset.create({
        data: {
          ticker,
          name:         data.name,
          assetClassId: data.assetClassId,
          assetType:    data.assetType as AssetType,
          isin:         data.isin,
          currencyCode: data.currencyCode,
          exchange:     data.exchange,
          sector:       data.sector,
          segment:      data.segment,
          issuer:       data.issuer,
          isActive:     data.isActive,
          notes:        data.notes,
          maturityDate: data.maturityDate ? new Date(data.maturityDate) : undefined,
          indexer:      data.indexer,
        },
        include: { assetClass: true },
      })
    } catch (err) {
      // Fallback para race condition: dois creates simultâneos do mesmo ticker
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new Error(
          `O ativo "${ticker}" já está cadastrado. Use-o diretamente ou edite-o na tela de Ativos.`,
        )
      }
      throw err
    }
  }

  async updateByTicker(ticker: string, data: UpdateAssetInput) {
    const updateData: Prisma.AssetUpdateInput = {}

    if (data.name            !== undefined) updateData.name            = data.name
    if (data.normalizedName  !== undefined) updateData.normalizedName  = data.normalizedName
    if (data.assetType       !== undefined) updateData.assetType       = data.assetType as AssetType
    if (data.isin            !== undefined) updateData.isin            = data.isin
    if (data.currencyCode    !== undefined) updateData.currencyCode    = data.currencyCode
    if (data.exchange        !== undefined) updateData.exchange        = data.exchange
    if (data.sector          !== undefined) updateData.sector          = data.sector
    if (data.segment         !== undefined) updateData.segment         = data.segment
    if (data.issuer          !== undefined) updateData.issuer          = data.issuer
    if (data.isActive        !== undefined) updateData.isActive        = data.isActive
    if (data.notes           !== undefined) updateData.notes           = data.notes
    if (data.maturityDate    !== undefined) updateData.maturityDate    = new Date(data.maturityDate)
    if (data.indexer         !== undefined) updateData.indexer         = data.indexer

    if (data.assetClassId !== undefined) {
      updateData.assetClass = { connect: { id: data.assetClassId } }
    }

    return prisma.asset.update({
      where:   { ticker },
      data:    updateData,
      include: { assetClass: true },
    })
  }

  async deleteByTicker(ticker: string) {
    return prisma.asset.delete({ where: { ticker } })
  }
}
