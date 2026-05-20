import { Router } from 'express';
import {
  listItems,
  recalculateTicker,
  recalculateAll,
  recalculateBatch,
} from './portfolio-items.controller';

export const portfolioItemsRouter = Router();

// Listagem da carteira atual
portfolioItemsRouter.get('/', listItems);

// Recalcular tudo
portfolioItemsRouter.post('/recalculate', recalculateAll);

// Recalcular lote
portfolioItemsRouter.post('/recalculate/batch', recalculateBatch);

// Recalcular ticker específico (deve ficar por último para não capturar /recalculate)
portfolioItemsRouter.post('/recalculate/:ticker', recalculateTicker);
