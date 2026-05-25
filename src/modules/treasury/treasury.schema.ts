import { z } from 'zod'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const TreasuryIndexer = z.enum(['SELIC', 'IPCA', 'PREFIXADO'])
export type TreasuryIndexer  = z.infer<typeof TreasuryIndexer>

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export const CreateTreasuryBondDto = z.object({
  /** Nome exato do título conforme radaropcoes, ex: "Tesouro Selic 2029" */
  bondName:          z.string().min(1).max(120),
  accountId:         z.string().cuid().optional(),
  indexer:           TreasuryIndexer,
  /** Taxa contratada na compra (ex: 10.65 = 10,65% a.a.) */
  purchaseRate:      z.number().positive(),
  purchaseDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maturityDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Quantidade de unidades (frações permitidas, ex: 0.13) */
  quantity:          z.number().positive(),
  /** Preço unitário na compra (PU Compra) */
  purchaseUnitValue: z.number().positive(),
})
export type CreateTreasuryBondDto = z.infer<typeof CreateTreasuryBondDto>

export const UpdateTreasuryBondDto = CreateTreasuryBondDto.partial().extend({
  isActive: z.boolean().optional(),
})
export type UpdateTreasuryBondDto = z.infer<typeof UpdateTreasuryBondDto>
