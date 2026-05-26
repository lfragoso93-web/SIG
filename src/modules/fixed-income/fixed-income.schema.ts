import { z } from 'zod'

// ---------------------------------------------------------------------------
// Tipos de produto de renda fixa privada suportados
// ---------------------------------------------------------------------------
export const FIXED_INCOME_TYPES = ['CDB', 'LCI', 'LCA', 'LF', 'CRI', 'CRA', 'DEBENTURE'] as const
export type FixedIncomeProductType = (typeof FIXED_INCOME_TYPES)[number]

// ---------------------------------------------------------------------------
// Indexadores suportados
// ---------------------------------------------------------------------------
export const INDEXERS = ['CDI', 'IPCA', 'SELIC', 'PREFIXADO', 'IGPM'] as const

// ---------------------------------------------------------------------------
// Criar / registrar um novo investimento em renda fixa
// ---------------------------------------------------------------------------
export const createFixedIncomeSchema = z.object({
  /** CDB, LCI, LCA, LF, CRI, CRA ou DEBENTURE */
  productType: z.enum(FIXED_INCOME_TYPES),

  /** Nome descritivo, ex: "CDB Banco XP 115% CDI" */
  name: z.string().min(3).max(150),

  /** Nome do emissor, ex: "Banco XP" */
  issuer: z.string().min(1).max(150),

  /** Indexador base */
  indexer: z.enum(INDEXERS),

  /**
   * Taxa contratada:
   * - CDI : percentual do CDI, ex: 1.15 = 115% CDI
   * - IPCA/SELIC/PREFIXADO: taxa a.a. decimal, ex: 0.1250 = 12,50% a.a.
   */
  rate: z.number().positive(),

  /** Data de aplicação (ISO date string) */
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  /** Data de vencimento (ISO date string) */
  maturityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  /** Valor principal investido em BRL */
  principal: z.number().positive(),

  /** ID da conta (opcional) */
  accountId: z.string().cuid().optional(),

  /** Liquidez em dias: 0 = diária | undefined = só no vencimento | N = carência */
  liquidityDays: z.number().int().min(0).optional(),
})

export type CreateFixedIncomeDto = z.infer<typeof createFixedIncomeSchema>

// ---------------------------------------------------------------------------
// Resgatar um investimento em renda fixa
// ---------------------------------------------------------------------------
export const redeemFixedIncomeSchema = z.object({
  /**
   * Valor a resgatar em BRL.
   * Se omitido, resgata o saldo total.
   */
  amount: z.number().positive().optional(),

  /** Data do resgate (ISO date). Default: hoje */
  redeemDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export type RedeemFixedIncomeDto = z.infer<typeof redeemFixedIncomeSchema>
