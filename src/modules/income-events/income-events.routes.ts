import { Router } from "express";
import {
  getIncomeEvents,
  getIncomeEventById,
  postIncomeEvent,
  patchIncomeEvent,
  deleteIncomeEventById,
  importIncomeEvents,
  importIncomeEventsBatchHandler,
} from "./income-events.controller";

export const incomeEventsRouter = Router();

incomeEventsRouter.get('/',           getIncomeEvents);
incomeEventsRouter.post('/',          postIncomeEvent);
incomeEventsRouter.get('/:id',        getIncomeEventById);
incomeEventsRouter.patch('/:id',      patchIncomeEvent);
incomeEventsRouter.delete('/:id',     deleteIncomeEventById);
incomeEventsRouter.post('/import/:ticker',  importIncomeEvents);
incomeEventsRouter.post('/import-batch',    importIncomeEventsBatchHandler);
