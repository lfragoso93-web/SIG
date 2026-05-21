import { z } from 'zod';

const rangeValues = ['1d','5d','1mo','3mo','6mo','1y','2y','5y','10y','ytd','max'] as const;
const intervalValues = ['1d','1wk','1mo'] as const;

export const importPriceHistorySchema = z
  .object({
    range:     z.enum(rangeValues).optional(),
    interval:  z.enum(intervalValues).default('1d'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine(
    (d) => d.range || (d.startDate && d.endDate),
    { message: 'Informe range ou startDate+endDate' },
  );

export type ImportPriceHistoryBody = z.infer<typeof importPriceHistorySchema>;

export const importPriceHistoryBatchSchema = z
  .object({
    tickers:   z.array(z.string().min(1)).optional(),
    range:     z.enum(rangeValues).optional(),
    interval:  z.enum(intervalValues).default('1d'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine(
    (d) => d.range || (d.startDate && d.endDate),
    { message: 'Informe range ou startDate+endDate' },
  );
