import { Router } from 'express';
import {
  listItems,
  recalculateTicker,
  recalculateAll,
  recalculateBatch,
} from './portfolio-items.controller';

export const portfolioItemsRouter = Router();

portfolioItemsRouter.get('/', listItems);
portfolioItemsRouter.post('/recalculate', recalculateAll);
portfolioItemsRouter.post('/recalculate/batch', recalculateBatch);
portfolioItemsRouter.post('/recalculate/:ticker', recalculateTicker);
