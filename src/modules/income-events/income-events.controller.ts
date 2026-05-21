import type { Request, Response } from "express";
import {
  findAllIncomeEvents,
  findIncomeEventById,
  createIncomeEvent,
  updateIncomeEvent,
  deleteIncomeEvent,
  importIncomeEventsFromBrapi,
  importIncomeEventsBatch,
} from "./income-events.service";
import {
  createIncomeEventSchema,
  updateIncomeEventSchema,
} from "./income-events.schema";

export const getIncomeEvents = async (_req: Request, res: Response) => {
  const events = await findAllIncomeEvents();
  res.json(events);
};

export const getIncomeEventById = async (req: Request, res: Response) => {
  const event = await findIncomeEventById(String(req.params.id));
  if (!event) { res.status(404).json({ error: 'Provento não encontrado' }); return; }
  res.json(event);
};

export const postIncomeEvent = async (req: Request, res: Response) => {
  const parsed = createIncomeEventSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const event = await createIncomeEvent(parsed.data);
  res.status(201).json(event);
};

export const patchIncomeEvent = async (req: Request, res: Response) => {
  const parsed = updateIncomeEventSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const event = await updateIncomeEvent(String(req.params.id), parsed.data);
  res.json(event);
};

export const deleteIncomeEventById = async (req: Request, res: Response) => {
  await deleteIncomeEvent(String(req.params.id));
  res.status(204).send();
};

export const importIncomeEvents = async (req: Request, res: Response) => {
  const ticker = String(req.params.ticker).toUpperCase();
  const result = await importIncomeEventsFromBrapi(ticker);
  res.json(result);
};

export const importIncomeEventsBatchHandler = async (req: Request, res: Response) => {
  const tickers: string[] | undefined = Array.isArray(req.body?.tickers)
    ? req.body.tickers.map((t: string) => t.toUpperCase())
    : undefined;
  const result = await importIncomeEventsBatch(tickers);
  res.json(result);
};
