import { Router } from 'express';
import { importPriceHistory, importPriceHistoryBatch } from './price-history.controller';
import priceHistoryImportController from './price-history.import.controller';

export const priceHistoryRouter = Router();

// IMPORTANTE: rota específica antes do wildcard /:ticker
// Importa PU de mercado atual via RadarOpcoes (Tesouro Direto)
priceHistoryRouter.post('/import/treasury/:bondName', (req, res) =>
  priceHistoryImportController.importFromRadarOpcoes(req, res)
);

// Importa histórico de preços via BRAPI (ações, FIIs, BDRs)
priceHistoryRouter.post('/import/:ticker', importPriceHistory);

// Importa em lote: body.tickers[] ou todos os ativos ativos
priceHistoryRouter.post('/import-batch', importPriceHistoryBatch);
