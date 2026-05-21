import type { Request, Response } from 'express';
import { priceHistoryService } from './price-history.service';
import { importPriceHistorySchema, importPriceHistoryBatchSchema } from './price-history.schema';

export const importPriceHistory = async (req: Request, res: Response) => {
  const ticker = req.params.ticker?.toUpperCase();
  const parsed = importPriceHistorySchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const result = await priceHistoryService.importFromBrapi({ ticker, ...parsed.data });
  res.json(result);
};

export const importPriceHistoryBatch = async (req: Request, res: Response) => {
  const parsed = importPriceHistoryBatchSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { tickers, ...options } = parsed.data;

  // Se tickers não informado ou vazio → importa todos os ativos ativos
  if (!tickers || tickers.length === 0) {
    const result = await priceHistoryService.importAllAssets(options);
    res.json(result);
    return;
  }

  const result = await priceHistoryService.importBatch(
    tickers.map((t) => t.toUpperCase()),
    options,
  );
  res.json(result);
};
