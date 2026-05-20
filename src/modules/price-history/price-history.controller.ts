import { Request, Response } from 'express';
import { priceHistoryService } from './price-history.service';
import { importPriceHistoryBodySchema, tickerParamSchema } from './price-history.schema';

class PriceHistoryController {
  async importFromBrapi(req: Request, res: Response) {
    try {
      const { ticker } = tickerParamSchema.parse(req.params);
      const body = importPriceHistoryBodySchema.parse(req.body);

      const result = await priceHistoryService.importFromBrapi({ ticker, ...body });

      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error?.message ?? 'Erro ao importar histórico de preços.' });
    }
  }
}

export const priceHistoryController = new PriceHistoryController();
