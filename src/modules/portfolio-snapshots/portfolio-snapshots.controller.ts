import type { Request, Response } from 'express';
import {
  generateSnapshot,
  generateSnapshotRange,
  listSnapshots,
  getSnapshotByDate,
  type SnapshotPeriodType,
} from './portfolio-snapshots.service';

const parsePeriod = (raw: unknown): SnapshotPeriodType => {
  if (raw === 'DAILY' || raw === 'WEEKLY') return raw as SnapshotPeriodType;
  return 'DAILY';
};

/**
 * POST /portfolio-snapshots/generate
 * Body (todos opcionais):
 *   referenceDate?: string  — padrão: hoje
 *   period?:        string  — padrão: 'DAILY'
 */
export const generateSnapshotHandler = async (req: Request, res: Response) => {
  try {
    const { referenceDate, period } = req.body as { referenceDate?: string; period?: string };

    const targetDate = referenceDate
      ? new Date(referenceDate)
      : new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

    const snap = await generateSnapshot(targetDate, parsePeriod(period));
    if (snap === null) {
      res.status(200).json({ skipped: true, reason: 'Nenhum preço disponível para essa data.' });
      return;
    }
    res.json({ skipped: false, snapshot: snap });
  } catch (err) {
    console.error('[snapshot] Erro ao gerar snapshot:', err);
    res.status(500).json({ error: 'Erro interno ao gerar snapshot.', detail: (err as Error).message });
  }
};

export const generateSnapshotRangeHandler = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, period } = req.body as { startDate?: string; endDate?: string; period?: string };
    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate e endDate são obrigatórios.' });
      return;
    }
    const result = await generateSnapshotRange(
      new Date(startDate),
      new Date(endDate),
      parsePeriod(period),
    );
    res.json(result);
  } catch (err) {
    console.error('[snapshot] Erro ao gerar range de snapshots:', err);
    res.status(500).json({ error: 'Erro interno ao gerar snapshots.', detail: (err as Error).message });
  }
};

export const listSnapshotsHandler = async (req: Request, res: Response) => {
  try {
    const from   = req.query.from   as string | undefined;
    const to     = req.query.to     as string | undefined;
    const period = req.query.period as string | undefined;
    const result = await listSnapshots(
      from ? new Date(from) : undefined,
      to   ? new Date(to)   : undefined,
      parsePeriod(period),
    );
    res.json(result);
  } catch (err) {
    console.error('[snapshot] Erro ao listar snapshots:', err);
    res.status(500).json({ error: 'Erro interno ao listar snapshots.', detail: (err as Error).message });
  }
};

export const getSnapshotByDateHandler = async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string | undefined;
    const snap = await getSnapshotByDate(
      new Date(req.params.date as string),
      parsePeriod(period),
    );
    if (!snap) {
      res.status(404).json({ error: 'Snapshot não encontrado.' });
      return;
    }
    res.json(snap);
  } catch (err) {
    console.error('[snapshot] Erro ao buscar snapshot por data:', err);
    res.status(500).json({ error: 'Erro interno ao buscar snapshot.', detail: (err as Error).message });
  }
};
