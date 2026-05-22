import { z } from 'zod'

export const updateAssetClassSchema = z.object({
  targetPercentage: z
    .number()
    .min(0, 'targetPercentage deve ser >= 0')
    .max(1, 'targetPercentage deve ser <= 1 (ex: 0.20 para 20%)')
    .nullable()
    .optional(),
})

export type UpdateAssetClassInput = z.infer<typeof updateAssetClassSchema>
