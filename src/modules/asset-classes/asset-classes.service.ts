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
      },
    })
  }
}