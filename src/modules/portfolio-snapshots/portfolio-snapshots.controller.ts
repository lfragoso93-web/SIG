import type { Request, Response } from 'express';
import {
  generateSnapshot,
  generateSnapshotRange,
  listSnapshots,
  getSnapshotByDate,
} from './portfolio-snapshots.service';

export const generateSnapshotHandler = async (req: Request, res: Response) => {
  const date = req.body?.date ? new Date(req.body.date) : new Date();
  if (isNaN(date.getTime())) {
    res.status(400).json({ error: 'Data inválida. Use o formato YYYY-MM-DD.' });
    return;
  }
  const result = await generateSnapshot(date);
  res.json(result);
};

export const generateSnapshotRangeHandler = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.body ?? {};
  if (!startDate || !endDate) {
    res.status(400).json({ error: 'Informe startDate e endDate no formato YYYY-MM-DD.' });
    return;
  }
  const start = new Date(startDate);
  const end   = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: 'Data inválida. Use o formato YYYY-MM-DD.' });
    return;
  }
  if (start > end) {
    res.status(400).json({ error: 'startDate deve ser anterior a endDate.' });
    return;
  }
  const result = await generateSnapshotRange(start, end);
  res.json(result);
};

export const listSnapshotsHandler = async (req: Request, res: Response) => {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to   = req.query.to   ? new Date(String(req.query.to))   : undefined;
  const result = await listSnapshots(from, to);
  res.json(result);
};

export const getSnapshotByDateHandler = async (req: Request, res: Response) => {
  const date = new Date(req.params.date);
  if (isNaN(date.getTime())) {
    res.status(400).json({ error: 'Data inválida. Use o formato YYYY-MM-DD.' });
    return;
  }
  const result = await getSnapshotByDate(date);
  if (!result) {
    res.status(404).json({ error: 'Snapshot não encontrado para essa data.' });
    return;
  }
  res.json(result);
};
