import { Request, Response, NextFunction } from 'express'
import transactionsService from './transactions.service'
import { createTransactionSchema, updateTransactionSchema } from './transactions.schema'
import { AuthPayload } from '../../shared/middleware/authenticate'

function userId(req: Request): string {
  return (req.user as AuthPayload).sub
}

export class TransactionsController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createTransactionSchema.parse(req.body)
      const tx   = await transactionsService.create({ ...data, userId: userId(req) })
      res.status(201).json(tx)
    } catch (err) { next(err) }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const txs = await transactionsService.findAll(userId(req))
      res.json(txs)
    } catch (err) { next(err) }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const tx = await transactionsService.findById(userId(req), req.params.id)
      res.json(tx)
    } catch (err) { next(err) }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateTransactionSchema.parse(req.body)
      const tx   = await transactionsService.update(userId(req), req.params.id, data)
      res.json(tx)
    } catch (err) { next(err) }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await transactionsService.remove(userId(req), req.params.id)
      res.status(204).send()
    } catch (err) { next(err) }
  }
}

export const transactionsController = new TransactionsController()
