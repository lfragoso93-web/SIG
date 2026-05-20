import { z } from 'zod';

export const recalculateSchema = z.object({
  ticker: z.string().min(1).toUpperCase(),
});

export const recalculateBatchSchema = z.object({
  tickers: z.array(z.string().min(1).toUpperCase()).min(1),
});

export type RecalculateInput = z.infer<typeof recalculateSchema>;
export type RecalculateBatchInput = z.infer<typeof recalculateBatchSchema>;
