import type { Request, Response, NextFunction } from 'express'
import { createFixedIncomeSchema, redeemFixedIncomeSchema } from './fixed-income.schema'
import * as service from './fixed-income.service'

export async function createFixedIncomeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dto    = createFixedIncomeSchema.parse(req.body)
    const result = await service.createFixedIncome(dto)
    res.status(201).json(result)
  } catch (err) { next(err) }
}

export async function listFixedIncomeHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await service.listFixedIncome()
    res.json(result)
  } catch (err) { next(err) }
}

export async function getFixedIncomeHandler(
  req: Request<{ assetId: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await service.getFixedIncome(req.params.assetId)
    res.json(result)
  } catch (err) { next(err) }
}

export async function redeemFixedIncomeHandler(
  req: Request<{ assetId: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const dto    = redeemFixedIncomeSchema.parse(req.body)
    const result = await service.redeemFixedIncome(req.params.assetId, dto)
    res.json(result)
  } catch (err) { next(err) }
}
