import { Router } from 'express';
import {
  generateSnapshotHandler,
  generateSnapshotRangeHandler,
  listSnapshotsHandler,
  getSnapshotByDateHandler,
} from './portfolio-snapshots.controller';

export const portfolioSnapshotsRouter = Router();

// Lista todos os snapshots (com filtros opcionais ?from=YYYY-MM-DD&to=YYYY-MM-DD)
portfolioSnapshotsRouter.get('/',                    listSnapshotsHandler);

// Gera snapshot de uma data específica (ou hoje se omitido)
portfolioSnapshotsRouter.post('/generate',           generateSnapshotHandler);

// Gera snapshots semanais retroativos entre duas datas
portfolioSnapshotsRouter.post('/generate-range',     generateSnapshotRangeHandler);

// Busca snapshot de uma data específica
portfolioSnapshotsRouter.get('/:date',               getSnapshotByDateHandler);
