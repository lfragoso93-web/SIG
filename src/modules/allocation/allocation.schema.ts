import { z } from 'zod'
import { SnapshotPeriod } from '@prisma/client'

const parseIsoDateOnlyToUtcDate = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined
  if (value instanceof Date) return value

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return new Date(`${trimmed}T00:00:00.000Z`)
    }

    return value
  }

  return value
}

const parseRequiredDecimal = (value: unknown) => {
  if (value === undefined || value === null || value === '') return value
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    const parsed = Number(normalized)
    if (!Number.isNaN(parsed)) return parsed
  }
  return value
}

export const allocationQuerySchema = z.object({
  referenceDate: z.preprocess(
    parseIsoDateOnlyToUtcDate,
    z.date().optional()
  ),
  period: z.nativeEnum(SnapshotPeriod).optional().default(SnapshotPeriod.WEEKLY),
})

export const allocationBodySchema = z.object({
  monthlyContribution: z.preprocess(
    parseRequiredDecimal,
    z.number().positive('monthlyContribution deve ser maior que zero')
  ),
})

export const allocationInputSchema = z.object({
  query: allocationQuerySchema,
  body: allocationBodySchema,
})

export type AllocationQueryInput = z.infer<typeof allocationQuerySchema>
export type AllocationBodyInput = z.infer<typeof allocationBodySchema>
export type AllocationInput = z.infer<typeof allocationInputSchema>