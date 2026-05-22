import { prisma } from '../../core/prisma/prisma.service'
import { AppError } from '../../core/errors/app-error'

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
      throw new AppError(`Classe de ativo não encontrada: ${code}`, 404)
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
