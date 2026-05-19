import { PrismaClient, AccountType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const classes = [
    { code: 'AÇÕES', name: 'Ações', displayOrder: 1 },
    { code: 'FIIS', name: 'Fundos Imobiliários', displayOrder: 2 },
    { code: 'ETFs', name: 'ETFs', displayOrder: 3 },
    { code: 'RENDA_FIXA', name: 'Renda Fixa', displayOrder: 4 },
    { code: 'EXTERIOR', name: 'Exterior', displayOrder: 5 },
    { code: 'CRIPTO', name: 'Criptomoedas', displayOrder: 6 },
    { code: 'CAIXA', name: 'Caixa', displayOrder: 7 },
  ]

  for (const item of classes) {
    await prisma.assetClass.upsert({
      where: { code: item.code },
      update: { name: item.name, displayOrder: item.displayOrder, isActive: true },
      create: item,
    })
  }

  const institutions = [
    { name: 'NuInvest' },
    { name: 'XP Investimentos' },
    { name: 'Banco do Brasil' },
    { name: 'Caixa Econômica' },
  ]

  for (const item of institutions) {
    await prisma.institution.upsert({
      where: { name: item.name },
      update: {},
      create: item,
    })
  }

  const [nuinvest, xp, bb, caixa, rendaFixaClass] = await Promise.all([
    prisma.institution.findUnique({ where: { name: 'NuInvest' } }),
    prisma.institution.findUnique({ where: { name: 'XP Investimentos' } }),
    prisma.institution.findUnique({ where: { name: 'Banco do Brasil' } }),
    prisma.institution.findUnique({ where: { name: 'Caixa Econômica' } }),
    prisma.assetClass.findUnique({ where: { code: 'RENDA_FIXA' } }),
  ])

  const accounts = [
    { name: 'Carteira Principal', type: AccountType.BROKERAGE, institutionId: nuinvest?.id ?? null },
    { name: 'Carteira XP', type: AccountType.BROKERAGE, institutionId: xp?.id ?? null },
    { name: 'Banco do Brasil', type: AccountType.BANK, institutionId: bb?.id ?? null },
    { name: 'Caixa', type: AccountType.BANK, institutionId: caixa?.id ?? null },
  ]

  for (const item of accounts) {
    await prisma.account.upsert({
      where: { name_institutionId: { name: item.name, institutionId: item.institutionId } },
      update: { type: item.type, isActive: true },
      create: item,
    })
  }

  const cashClass = await prisma.assetClass.findUnique({ where: { code: 'CAIXA' } })

  if (rendaFixaClass && cashClass) {
    await prisma.allocationTarget.upsert({
      where: {
        assetClassId_effectiveFrom: {
          assetClassId: rendaFixaClass.id,
          effectiveFrom: new Date('2026-01-01'),
        },
      },
      update: { targetPercentage: 0.35, effectiveTo: null },
      create: {
        assetClassId: rendaFixaClass.id,
        targetPercentage: 0.35,
        effectiveFrom: new Date('2026-01-01'),
      },
    })

    await prisma.allocationTarget.upsert({
      where: {
        assetClassId_effectiveFrom: {
          assetClassId: cashClass.id,
          effectiveFrom: new Date('2026-01-01'),
        },
      },
      update: { targetPercentage: 0.05, effectiveTo: null },
      create: {
        assetClassId: cashClass.id,
        targetPercentage: 0.05,
        effectiveFrom: new Date('2026-01-01'),
      },
    })
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })