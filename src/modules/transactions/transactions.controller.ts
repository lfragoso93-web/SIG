import { Request, Response } from "express";
import { transactionsService } from "./transactions.service";
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionIdParamSchema,
} from "./transactions.schema";

class TransactionsController {
  async create(req: Request, res: Response) {
    try {
      const data = createTransactionSchema.parse(req.body);
      const transaction = await transactionsService.create(data);
      return res.status(201).json(transaction);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async findAll(_req: Request, res: Response) {
    try {
      const transactions = await transactionsService.findAll();
      return res.status(200).json(transactions);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const { id } = transactionIdParamSchema.parse(req.params);
      const transaction = await transactionsService.findById(id);
      return res.status(200).json(transaction);
    } catch (error: any) {
      return res.status(404).json({ message: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = transactionIdParamSchema.parse(req.params);
      const data = updateTransactionSchema.parse(req.body);
      const transaction = await transactionsService.update(id, data);
      return res.status(200).json(transaction);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const { id } = transactionIdParamSchema.parse(req.params);
      await transactionsService.remove(id);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(404).json({ message: error.message });
    }
  }
}

export const transactionsController = new TransactionsController();