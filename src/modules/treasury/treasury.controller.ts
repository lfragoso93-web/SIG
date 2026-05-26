import type { Request, Response, NextFunction } from 'express'
import {
  createTreasuryBond,
  listTreasuryBonds,
  getTreasuryBond,
  updateTreasuryBond,
  listAvailableBonds,
} from './treasury.service'
import {
  CreateTreasuryBondDto,
  UpdateTreasuryBondDto,
} from './treasury.schema'

export async function handleListAvailableBonds(
  _req: Request, res: Response, next: NextFunction,
) {
  try {
    const bonds = await listAvailableBonds()
    res.json(bonds)
  } catch (err) { next(err) }
}

export async function handleListTreasuryBonds(
  _req: Request, res: Response, next: NextFunction,
) {
  try {
    const bonds = await listTreasuryBonds()
    res.json(bonds)
  } catch (err) { next(err) }
}

export async function handleGetTreasuryBond(
  req: Request, res: Response, next: NextFunction,
) {
  try {
    const bond = await getTreasuryBond(String(req.params.assetId))
    res.json(bond)
  } catch (err) { next(err) }
}

export async function handleCreateTreasuryBond(
  req: Request, res: Response, next: NextFunction,
) {
  try {
    const dto    = CreateTreasuryBondDto.parse(req.body)
    const result = await createTreasuryBond(dto)
    res.status(201).json(result)
  } catch (err) { next(err) }
}

export async function handleUpdateTreasuryBond(
  req: Request, res: Response, next: NextFunction,
) {
  try {
    const dto    = UpdateTreasuryBondDto.parse(req.body)
    const result = await updateTreasuryBond(String(req.params.assetId), dto)
    res.json(result)
  } catch (err) { next(err) }
}
