import { Router } from 'express';
import { priceHistoryController } from './price-history.controller';

export const priceHistoryRouter = Router();

priceHistoryRouter.post(
  '/import/:ticker',
  (req, res) => priceHistoryController.importFromBrapi(req, res)
);
