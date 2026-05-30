import { Request, Response, NextFunction } from 'express'
import {
  generateSnapshot,
  generateSnapshotRange,
  listSnapshots,
  getSnapshotByDate,
} from './portfolio-snapshots.service'
import { AuthPayload } from '../../shared/middleware/authenticate'

function userId(req: Request): string {
  return (req.user as AuthPayload).sub
}

export class PortfolioSnapshotsController {
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const { date, period } = req.body
      const refDate = date ? new Date(date) : new Date()
      const snap    = await generateSnapshot(userId(req), refDate, period ?? 'WEEKLY')
      res.json(snap ?? { message: 'Nenhum ativo com posição para a data informada.' })
    } catch (err) { next(err) }
  }

  async generateRange(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, period } = req.body
      const result = await generateSnapshotRange(userId(req), new Date(startDate), new Date(endDate), period ?? 'WEEKLY')
      res.json(result)
    } catch (err) { next(err) }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to, period } = req.query as Record<string, string>
      const snaps = await listSnapshots(
        userId(req),
        from ? new Date(from) : undefined,
        to   ? new Date(to)   : undefined,
        (period as any) ?? 'WEEKLY',
      )
      res.json(snaps)
    } catch (err) { next(err) }
  }

  async getByDate(req: Request, res: Response, next: NextFunction) {
    try {
      const { date, period } = req.query as Record<string, string>
      const snap = await getSnapshotByDate(userId(req), new Date(date), (period as any) ?? 'WEEKLY')
      res.json(snap ?? null)
    } catch (err) { next(err) }
  }
}

export const portfolioSnapshotsController = new PortfolioSnapshotsController()
