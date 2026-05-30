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
 *
 * Usado tanto pelo botão manual quanto pelo trigger automático do front-end.
 */
export const generateSnapshotHandler = async (req: Request, res: Response) => {
  const { referenceDate, period } = req.body as { referenceDate?: string; period?: string };

  // Se não vier referenceDate, usa a data de hoje no fuso de Brasília
  const targetDate = referenceDate
    ? new Date(referenceDate)
    : new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))

  const snap = await generateSnapshot(targetDate, parsePeriod(period));
  if (snap === null) {
    // Feriado ou fim de semana — retorna 200 com flag, não é erro
    res.status(200).json({ skipped: true, reason: 'Nenhum preço disponível para essa data.' });
    return;
  }
  res.json({ skipped: false, snapshot: snap });
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
  const snap = await getSnapshotByDate(
    new Date(req.params.date as string),
    parsePeriod(period),
  );
  if (!snap) {
    res.status(404).json({ error: 'Snapshot não encontrado.' });
    return;
  }
  res.json(snap);
};
