import { z } from 'zod';

export const importPriceHistoryBodySchema = z
  .object({
    interval: z
      .enum(['1m','2m','5m','15m','30m','60m','90m','1h','1d','5d','1wk','1mo','3mo'])
      .default('1d'),
    range: z
      .enum(['1d','2d','5d','7d','1mo','3mo','6mo','1y','2y','5y','10y','ytd','max'])
      .optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD').optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD').optional(),
  })
  .refine(
    (data) => {
      const hasStart = !!data.startDate;
      const hasEnd = !!data.endDate;
      return hasStart === hasEnd;
    },
    { message: 'startDate e endDate devem ser informados juntos.' }
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) return true;
      return !!data.range;
    },
    {
      message: 'Informe range OU startDate + endDate.',
    }
  );

export const tickerParamSchema = z.object({
  ticker: z.string().min(1).toUpperCase(),
});

export type ImportPriceHistoryBody = z.infer<typeof importPriceHistoryBodySchema>;
