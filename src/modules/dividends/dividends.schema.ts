import { z } from 'zod'

export const dividendsSummaryQuerySchema = z.object({
  year: z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return undefined
    return Number(v)
  }, z.number().int().min(2000).max(2100).optional()),
})

export type DividendsSummaryQueryInput = z.infer<typeof dividendsSummaryQuerySchema>
