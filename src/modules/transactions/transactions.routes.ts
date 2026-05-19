import { Router } from "express";
import { transactionsController } from "./transactions.controller";

export const transactionsRouter = Router();

transactionsRouter.post("/", (req, res) => transactionsController.create(req, res));
transactionsRouter.get("/", (req, res) => transactionsController.findAll(req, res));
transactionsRouter.get("/:id", (req, res) => transactionsController.findById(req, res));
transactionsRouter.patch("/:id", (req, res) => transactionsController.update(req, res));
transactionsRouter.delete("/:id", (req, res) => transactionsController.remove(req, res));