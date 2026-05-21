import { AssetType, Prisma } from '@prisma/client'
import { prisma } from '../../core/prisma/prisma.service'

type CreateAssetInput = {
  ticker: string
  name: string
  assetClassId: string
  assetType: string
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
    return prisma.asset.create({
      data: {
        ticker:       data.ticker,
        name:         data.name,
        assetClassId: data.assetClassId,
        assetType:    data.assetType as AssetType,
      },
      include: { assetClass: true },
    })
  }

  async updateByTicker(ticker: string, data: UpdateAssetInput) {
    // Constrói o objeto de update do Prisma explicitamente
    // para evitar conflito entre AssetUpdateInput e AssetUncheckedUpdateInput
    const updateData: Prisma.AssetUpdateInput = {}

    if (data.name           !== undefined) updateData.name           = data.name
    if (data.normalizedName !== undefined) updateData.normalizedName = data.normalizedName
    if (data.assetType      !== undefined) updateData.assetType      = data.assetType as AssetType
    if (data.isin           !== undefined) updateData.isin           = data.isin
    if (data.currencyCode   !== undefined) updateData.currencyCode   = data.currencyCode
    if (data.exchange       !== undefined) updateData.exchange       = data.exchange
    if (data.sector         !== undefined) updateData.sector         = data.sector
    if (data.segment        !== undefined) updateData.segment        = data.segment
    if (data.issuer         !== undefined) updateData.issuer         = data.issuer
    if (data.isActive       !== undefined) updateData.isActive       = data.isActive
    if (data.notes          !== undefined) updateData.notes          = data.notes

    // assetClassId deve usar a relação do Prisma, não a FK direta
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
