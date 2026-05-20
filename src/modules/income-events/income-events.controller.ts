import type { Request, Response } from "express";
import {
  findAllIncomeEvents,
  findIncomeEventById,
  createIncomeEvent,
  updateIncomeEvent,
  deleteIncomeEvent,
  importIncomeEventsFromBrapi,
} from "./income-events.service";
import {
  createIncomeEventSchema,
  updateIncomeEventSchema,
  incomeEventIdParamSchema,
  importIncomeEventsParamSchema,
} from "./income-events.schema";

export const getAll = async (_req: Request, res: Response) => {
  const data = await findAllIncomeEvents();
  res.json(data);
};

export const getById = async (req: Request, res: Response) => {
  const { id } = incomeEventIdParamSchema.parse(req.params);
  const data = await findIncomeEventById(id);
  if (!data) return res.status(404).json({ error: "IncomeEvent não encontrado." });
  res.json(data);
};

export const create = async (req: Request, res: Response) => {
  const body = createIncomeEventSchema.parse(req.body);
  const data = await createIncomeEvent(body);
  res.status(201).json(data);
};

export const update = async (req: Request, res: Response) => {
  const { id } = incomeEventIdParamSchema.parse(req.params);
  const body = updateIncomeEventSchema.parse(req.body);
  const data = await updateIncomeEvent(id, body);
  res.json(data);
};

export const remove = async (req: Request, res: Response) => {
  const { id } = incomeEventIdParamSchema.parse(req.params);
  await deleteIncomeEvent(id);
  res.status(204).send();
};

export const importFromBrapi = async (req: Request, res: Response) => {
  const { ticker } = importIncomeEventsParamSchema.parse(req.params);
  const result = await importIncomeEventsFromBrapi(ticker);
  res.json(result);
};
