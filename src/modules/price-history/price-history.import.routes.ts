// src/modules/price-history/price-history.import.routes.ts

import { Router } from 'express';
import priceHistoryImportController from './price-history.import.controller';

const router = Router();

/** Importa histórico de preços via BRAPI (ações, FIIs, BDRs) */
router.post('/price-history/import/:ticker', (req, res) =>
  priceHistoryImportController.importFromBrapi(req, res)
);

/** Importa PU de mercado atual via RadarOpcoes (Tesouro Direto) */
router.post('/price-history/import/treasury/:bondName', (req, res) =>
  priceHistoryImportController.importFromRadarOpcoes(req, res)
);

export default router;
