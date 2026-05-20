import { Router } from "express";
import {
  getAll,
  getById,
  create,
  update,
  remove,
  importFromBrapi,
} from "./income-events.controller";

export const incomeEventsRouter = Router();

incomeEventsRouter.get("/", getAll);
incomeEventsRouter.post("/", create);
incomeEventsRouter.get("/:id", getById);
incomeEventsRouter.patch("/:id", update);
incomeEventsRouter.delete("/:id", remove);
incomeEventsRouter.post("/import/:ticker", importFromBrapi);
