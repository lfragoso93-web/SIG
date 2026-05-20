import { Request, Response } from 'express';
import {
  recalculatePortfolioItem,
  recalculateAllPortfolioItems,
  listPortfolioItems,
} from './portfolio-items.service';
import { recalculateBatchSchema } from './portfolio-items.schema';

/**
 * GET /portfolio-items
 * Lista todos os itens da carteira com quantidade > 0.
 */
export async function listItems(req: Request, res: Response) {
  const items = await listPortfolioItems();
  res.json(items);
}

/**
 * POST /portfolio-items/recalculate/:ticker
 * Recalcula a posição de um ativo específico.
 */
export async function recalculateTicker(req: Request, res: Response) {
  const ticker = req.params.ticker?.toUpperCase();
  if (!ticker) {
    res.status(400).json({ message: 'ticker obrigatório' });
    return;
  }
  const result = await recalculatePortfolioItem(ticker);
  res.json(result);
}

/**
 * POST /portfolio-items/recalculate
 * Recalcula a posição de todos os ativos com transações.
 */
export async function recalculateAll(req: Request, res: Response) {
  const result = await recalculateAllPortfolioItems();
  res.json(result);
}

/**
 * POST /portfolio-items/recalculate/batch
 * Recalcula a posição de uma lista específica de tickers.
 */
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
