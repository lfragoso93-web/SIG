import { prisma } from '../../core/prisma/prisma.service'

type CreateAssetInput = {
  ticker: string
  name: string
  assetClassId: string
  assetType: string
}

export class AssetsService {
  async listAll() {
    return prisma.asset.findMany({
      orderBy: [{ ticker: 'asc' }],
      include: {
        assetClass: true,
      },
    })
  }

  async findByTicker(ticker: string) {
    return prisma.asset.findUnique({
      where: { ticker },
      include: {
        assetClass: true,
      },
    })
  }

  async create(data: CreateAssetInput) {
    return prisma.asset.create({
      data: {
        ticker: data.ticker,
        name: data.name,
        assetClassId: data.assetClassId,
        assetType: data.assetType as any,
      },
      include: {
        assetClass: true,
      },
    })
  }
    async updateByTicker(
    ticker: string,
    data: {
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
  ) {
    return prisma.asset.update({
      where: { ticker },
      data,
      include: {
        assetClass: true,
      },
    })
  }
    async deleteByTicker(ticker: string) {
    return prisma.asset.delete({
      where: { ticker },
    })
  }
}