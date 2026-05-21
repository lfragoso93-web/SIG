import { Request, Response } from 'express';
import {
  recalculatePortfolioItem,
  recalculateAllPortfolioItems,
  listPortfolioItems,
} from './portfolio-items.service';
import { recalculateBatchSchema } from './portfolio-items.schema';

export async function listItems(req: Request, res: Response) {
  const items = await listPortfolioItems();
  res.json(items);
}

export async function recalculateTicker(req: Request, res: Response) {
  const ticker = String(req.params.ticker).toUpperCase();
  if (!ticker) {
    res.status(400).json({ message: 'ticker obrigatório' });
    return;
  }
  const result = await recalculatePortfolioItem(ticker);
  res.json(result);
}

export async function recalculateAll(req: Request, res: Response) {
  const result = await recalculateAllPortfolioItems();
  res.json(result);
}

export async function recalculateBatch(req: Request, res: Response) {
  const parsed = recalculateBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: JSON.stringify(parsed.error.errors) });
    return;
  }
  const results = [];
  const errors = [];
  for (const ticker of parsed.data.tickers) {
    try {
      const result = await recalculatePortfolioItem(ticker);
      results.push(result);
    } catch (err) {
      errors.push({ ticker, error: (err as Error).message });
    }
  }
  res.json({ recalculated: results.length, errors, items: results });
}
