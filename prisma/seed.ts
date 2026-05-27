import { PrismaClient, AccountType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL não definida.')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function upsertAssetClass(item: {
  code: string
  name: string
  description: string
  displayOrder: number
}) {
  const existingByCode = await prisma.assetClass.findUnique({
    where: { code: item.code },
  })

  if (existingByCode) {
    await prisma.assetClass.update({
      where: { code: item.code },
      data: {
        name: item.name,
        description: item.description,
        displayOrder: item.displayOrder,
        isActive: true,
      },
    })
    return
  }

  const existingByName = await prisma.assetClass.findUnique({
    where: { name: item.name },
  })

  if (existingByName) {
    await prisma.assetClass.update({
      where: { id: existingByName.id },
      data: {
        code: item.code,
        name: item.name,
        description: item.description,
        displayOrder: item.displayOrder,
        isActive: true,
      },
    })
    return
  }

  await prisma.assetClass.create({
    data: {
      code: item.code,
      name: item.name,
      description: item.description,
      displayOrder: item.displayOrder,
      isActive: true,
    },
  })
}

async function seedAdminUser() {
  const username    = process.env.INITIAL_ADMIN_USERNAME ?? 'admin'
  const rawPassword = process.env.INITIAL_ADMIN_PASSWORD

  if (!rawPassword) {
    console.warn(
      '[seed] ATENÇÃO: INITIAL_ADMIN_PASSWORD não definida. ' +
      'O usuário admin não foi criado. ' +
      'Defina a variável no .env e rode o seed novamente.',
    )
    return
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    console.log(`[seed] Usuário '${username}' já existe — pulando criação.`)
    return
  }

  const passwordHash = await bcrypt.hash(rawPassword, 12)
  await prisma.user.create({
    data: {
      username,
      passwordHash,
      displayName: 'Administrador',
      role: 'ADMIN',
      isActive: true,
    },
  })

  console.log(`[seed] Usuário '${username}' criado com sucesso.`)
}

async function main() {
  // ── 1. Usuário admin ─────────────────────────────────────────────────────
  await seedAdminUser()

  // ── 2. Migração de códigos legados de AssetClass ─────────────────────────
  const legacyCodeMap: Record<string, string> = {
    AÇÕES: 'DOMESTIC_STOCK',
    FIIS: 'FII',
    ETFs: 'ETF',
    RENDA_FIXA: 'FIXED_INCOME',
    EXTERIOR: 'STOCK',
    CRIPTO: 'CRYPTO',
    CAIXA: 'CASH',
  }

  for (const [oldCode, newCode] of Object.entries(legacyCodeMap)) {
    const oldRow = await prisma.assetClass.findUnique({ where: { code: oldCode } })
    const newRow = await prisma.assetClass.findUnique({ where: { code: newCode } })

    if (oldRow && !newRow) {
      await prisma.assetClass.update({
        where: { id: oldRow.id },
        data: { code: newCode },
      })
    }
  }

  // ── 3. Classes de ativos ──────────────────────────────────────────────────
  const classes = [
    {
      code: 'DOMESTIC_STOCK',
      name: 'Ação Nacional',
      description: 'Ações listadas no mercado brasileiro.',
      displayOrder: 1,
    },
    {
      code: 'STOCK',
      name: 'Ação Internacional',
      description: 'Ações internacionais individuais listadas no exterior.',
      displayOrder: 2,
    },
    {
      code: 'ETF',
      name: 'ETF Nacional',
      description: 'ETFs listados no mercado brasileiro.',
      displayOrder: 3,
    },
    {
      code: 'INTERNATIONAL_ETF',
      name: 'ETF Internacional',
      description: 'ETFs listados no exterior.',
      displayOrder: 4,
    },
    {
      code: 'FII',
      name: 'Fundo Imobiliário',
      description: 'Fundos imobiliários listados no mercado brasileiro.',
      displayOrder: 5,
    },
    {
      code: 'BDR',
      name: 'BDR',
      description: 'Brazilian Depositary Receipts.',
      displayOrder: 6,
    },
    {
      code: 'CRYPTO',
      name: 'Criptoativo',
      description: 'Criptoativos e moedas digitais.',
      displayOrder: 7,
    },
    {
      code: 'FIXED_INCOME',
      name: 'Renda Fixa',
      description: 'Produtos de renda fixa privada ou bancária.',
      displayOrder: 8,
    },
    {
      code: 'TREASURY',
      name: 'Tesouro Direto',
      description: 'Títulos públicos do Tesouro Direto.',
      displayOrder: 9,
    },
    {
      code: 'CASH',
      name: 'Caixa',
      description: 'Saldo em conta, caixa ou posição não investida.',
      displayOrder: 10,
    },
  ]

  for (const item of classes) {
    await upsertAssetClass(item)
  }

  // ── 4. Instituições ───────────────────────────────────────────────────────
  const institutions = [
    { name: 'NuInvest' },
    { name: 'XP Investimentos' },
    { name: 'Banco do Brasil' },
    { name: 'Caixa Econômica' },
  ]

  for (const item of institutions) {
    await prisma.institution.upsert({
      where: { name: item.name },
      update: { updatedAt: new Date() },
      create: item,
    })
  }

  // ── 5. Contas ─────────────────────────────────────────────────────────────
  const [nuinvest, xp, bb, caixa, fixedIncomeClass, cashClass] = await Promise.all([
    prisma.institution.findUnique({ where: { name: 'NuInvest' } }),
    prisma.institution.findUnique({ where: { name: 'XP Investimentos' } }),
    prisma.institution.findUnique({ where: { name: 'Banco do Brasil' } }),
    prisma.institution.findUnique({ where: { name: 'Caixa Econômica' } }),
    prisma.assetClass.findUnique({ where: { code: 'FIXED_INCOME' } }),
    prisma.assetClass.findUnique({ where: { code: 'CASH' } }),
  ])

  const accounts = [
    { name: 'Carteira Principal', type: AccountType.BROKERAGE, institutionId: nuinvest?.id ?? null },
    { name: 'Carteira XP', type: AccountType.BROKERAGE, institutionId: xp?.id ?? null },
    { name: 'Banco do Brasil', type: AccountType.BANK, institutionId: bb?.id ?? null },
    { name: 'Caixa', type: AccountType.BANK, institutionId: caixa?.id ?? null },
  ]

  for (const item of accounts) {
    await prisma.account.upsert({
      where: {
        name_institutionId: {
          name: item.name,
          institutionId: item.institutionId,
        },
      },
      update: {
        type: item.type,
        isActive: true,
        currencyCode: 'BRL',
      },
      create: {
        name: item.name,
        type: item.type,
        institutionId: item.institutionId,
        currencyCode: 'BRL',
        isActive: true,
      },
    })
  }

  // ── 6. Metas de alocação ──────────────────────────────────────────────────
  if (fixedIncomeClass) {
    await prisma.allocationTarget.upsert({
      where: {
        assetClassId_effectiveFrom: {
          assetClassId: fixedIncomeClass.id,
          effectiveFrom: new Date('2026-01-01'),
        },
      },
      update: { targetPercentage: 0.35, effectiveTo: null },
      create: {
        assetClassId: fixedIncomeClass.id,
        targetPercentage: 0.35,
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: null,
      },
    })
  }

  if (cashClass) {
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
        effectiveTo: null,
      },
    })
  }

  console.log('Seed concluído com sucesso.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
