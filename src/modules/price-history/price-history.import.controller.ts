import { Request, Response } from 'express';
import priceHistoryImportService from './price-history.import.service';

class PriceHistoryImportController {
  async importFromBrapi(req: Request, res: Response) {
    try {
      const ticker = String(req.params.ticker);
      const { interval, range, startDate, endDate } = req.body;

      const result = await priceHistoryImportService.importFromBrapi({
        ticker,
        interval,
        range,
        startDate,
        endDate,
      });

      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({
        message: error?.message || 'Erro ao importar histórico de preços.',
      });
    }
  }

  async importFromRadarOpcoes(req: Request, res: Response) {
    try {
      const bondName = decodeURIComponent(String(req.params.bondName));

      const result = await priceHistoryImportService.importFromRadarOpcoes(bondName);

      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({
        message: error?.message || 'Erro ao importar PU do Tesouro Direto.',
      });
    }
  }
}

export default new PriceHistoryImportController();
