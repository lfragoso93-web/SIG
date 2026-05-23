import { z } from 'zod'

export const importPriceHistorySchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine(
    (d) => !(d.startDate && !d.endDate) && !(!d.startDate && d.endDate),
    { message: 'Informe startDate e endDate juntos, ou omita ambos para buscar histórico completo.' },
  )

export type ImportPriceHistoryBody = z.infer<typeof importPriceHistorySchema>

export const importPriceHistoryBatchSchema = z.object({
  tickers:   z.array(z.string().min(1)).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
