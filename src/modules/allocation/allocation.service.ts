import { Prisma, SnapshotPeriod } from '@prisma/client'
import { prisma } from '../../core/prisma/prisma.service'
import { AllocationBodyInput, AllocationQueryInput } from './allocation.schema'

type AllocationClassResult = {
  assetClassId: string
  code: string
  name: string
  currentAmount: number
  currentPercentage: number | null
  targetPercentage: number | null
  targetAmount: number
  gapAmount: number
  suggestedContribution: number
  projectedAmount: number
  projectedPercentage: number | null
}

type AllocationResult = {
  referenceDate: string
  period: SnapshotPeriod
  monthlyContribution: number
  totalCurrentValue: number
  totalTargetValue: number
  totalGapPositive: number
  classes: AllocationClassResult[]
}

const decimalToNumber = (value: Prisma.Decimal | null | undefined) => {
  if (!value) return 0
  return value.toNumber()
}

export class AllocationService {
  async calculate(query: AllocationQueryInput, body: AllocationBodyInput): Promise<AllocationResult> {
    const referenceDate = query.referenceDate ?? new Date()
    const period = query.period ?? SnapshotPeriod.WEEKLY
    const monthlyContribution = body.monthlyContribution

    const snapshot = await prisma.portfolioSnapshot.findFirst({
      where: {
        period,
        referenceDate: {
          lte: referenceDate,
        },
      },
      orderBy: {
        referenceDate: 'desc',
      },
      include: {
        classSnapshots: {
          include: {
            assetClass: true,
          },
        },
      },
    })

    if (!snapshot) {
      throw new Error('Nenhum snapshot encontrado para os filtros informados.')
    }

    const activeTargets = await prisma.allocationTarget.findMany({
      where: {
        effectiveFrom: {
          lte: snapshot.referenceDate,
        },
        OR: [
          { effectiveTo: null },
          {
            effectiveTo: {
              gte: snapshot.referenceDate,
            },
          },
        ],
      },
      include: {
        assetClass: true,
      },
    })

    const targetByClassId = new Map(
      activeTargets.map((target) => [target.assetClassId, target])
    )

    const totalCurrentValue = decimalToNumber(snapshot.totalMarketValue)
    const totalTargetValue = totalCurrentValue + monthlyContribution

    const baseRows = snapshot.classSnapshots.map((item) => {
      const currentAmount = decimalToNumber(item.marketValue)
      const currentPercentage =
        item.currentPercentage !== null ? item.currentPercentage.toNumber() : null

      const target = targetByClassId.get(item.assetClassId)
      const targetPercentage =
        target?.targetPercentage ? target.targetPercentage.toNumber() : null

      const targetAmount =
        targetPercentage !== null ? totalTargetValue * targetPercentage : 0

      const rawGap = targetAmount - currentAmount
      const gapAmount = rawGap > 0 ? rawGap : 0

      return {
        assetClassId: item.assetClassId,
        code: item.assetClass.code,
        name: item.assetClass.name,
        currentAmount,
        currentPercentage,
        targetPercentage,
        targetAmount,
        gapAmount,
      }
    })

    const totalGapPositive = baseRows.reduce((sum, item) => sum + item.gapAmount, 0)

    const classes: AllocationClassResult[] = baseRows.map((item) => {
      const suggestedContribution =
        totalGapPositive > 0
          ? (item.gapAmount / totalGapPositive) * monthlyContribution
          : 0

      const projectedAmount = item.currentAmount + suggestedContribution
      const projectedPercentage =
        totalTargetValue > 0 ? projectedAmount / totalTargetValue : null

      return {
        assetClassId: item.assetClassId,
        code: item.code,
        name: item.name,
        currentAmount: Number(item.currentAmount.toFixed(2)),
        currentPercentage:
          item.currentPercentage !== null
            ? Number(item.currentPercentage.toFixed(6))
            : null,
        targetPercentage:
          item.targetPercentage !== null
            ? Number(item.targetPercentage.toFixed(6))
            : null,
        targetAmount: Number(item.targetAmount.toFixed(2)),
        gapAmount: Number(item.gapAmount.toFixed(2)),
        suggestedContribution: Number(suggestedContribution.toFixed(2)),
        projectedAmount: Number(projectedAmount.toFixed(2)),
        projectedPercentage:
          projectedPercentage !== null
            ? Number(projectedPercentage.toFixed(6))
            : null,
      }
    })

    return {
      referenceDate: snapshot.referenceDate.toISOString().slice(0, 10),
      period: snapshot.period,
      monthlyContribution: Number(monthlyContribution.toFixed(2)),
      totalCurrentValue: Number(totalCurrentValue.toFixed(2)),
      totalTargetValue: Number(totalTargetValue.toFixed(2)),
      totalGapPositive: Number(totalGapPositive.toFixed(2)),
      classes,
    }
  }
}

export const allocationService = new AllocationService()