// src/modules/price-history/price-history.import.routes.ts

import { Router } from 'express';
import priceHistoryImportController from './price-history.import.controller';

const router = Router();

router.post('/price-history/import/:ticker', (req, res) =>
  priceHistoryImportController.importFromBrapi(req, res)
);

export default router;