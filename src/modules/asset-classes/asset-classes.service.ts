import { prisma } from '../../core/prisma/prisma.service'

export class AssetClassesService {
  async listAll() {
    return prisma.assetClass.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        displayOrder: true,
        isActive: true,
        targetPercentage: true,
      },
    })
  }

  async findByCode(code: string) {
    return prisma.assetClass.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        displayOrder: true,
        isActive: true,
        targetPercentage: true,
      },
    })
  }

  async updateByCode(code: string, data: { targetPercentage?: number | null }) {
    const assetClass = await prisma.assetClass.findUnique({ where: { code } })

    if (!assetClass) {
      const error = new Error(`Classe de ativo não encontrada: ${code}`) as Error & { statusCode?: number }
      error.statusCode = 404
      throw error
    }

    return prisma.assetClass.update({
      where: { code },
      data: {
        targetPercentage:
          data.targetPercentage !== undefined ? data.targetPercentage : undefined,
      },
      select: {
        id: true,
        code: true,
        name: true,
        targetPercentage: true,
      },
    })
  }
}
