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
  return 'WEEKLY';
};

export const generateSnapshotHandler = async (req: Request, res: Response) => {
  const { referenceDate, period } = req.body as { referenceDate?: string; period?: string };
  if (!referenceDate) {
    res.status(400).json({ error: 'referenceDate é obrigatório.' });
    return;
  }
  const snap = await generateSnapshot(new Date(referenceDate), parsePeriod(period));
  if (snap === null) {
    res.status(422).json({ error: 'Nenhum preço disponível para essa data (feriado ou fim de semana).' });
    return;
  }
  res.json(snap);
};

export const generateSnapshotRangeHandler = async (req: Request, res: Response) => {
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
};

export const listSnapshotsHandler = async (req: Request, res: Response) => {
  const from   = req.query.from   as string | undefined;
  const to     = req.query.to     as string | undefined;
  const period = req.query.period as string | undefined;
  const result = await listSnapshots(
    from ? new Date(from) : undefined,
    to   ? new Date(to)   : undefined,
    parsePeriod(period),
  );
  res.json(result);
};

export const getSnapshotByDateHandler = async (req: Request, res: Response) => {
  const period = req.query.period as string | undefined;
  const snap = await getSnapshotByDate(new Date(req.params.date), parsePeriod(period));
  if (!snap) {
    res.status(404).json({ error: 'Snapshot não encontrado.' });
    return;
  }
  res.json(snap);
};
