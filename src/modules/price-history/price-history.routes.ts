import { Router } from 'express';
import { importPriceHistory, importPriceHistoryBatch } from './price-history.controller';

export const priceHistoryRouter = Router();

// Importa histórico de um ticker específico
priceHistoryRouter.post('/import/:ticker', importPriceHistory);

// Importa em lote: body.tickers[] ou todos os ativos ativos
priceHistoryRouter.post('/import-batch', importPriceHistoryBatch);
