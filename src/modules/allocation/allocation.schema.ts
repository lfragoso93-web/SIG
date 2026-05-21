import { z } from 'zod'
import { SnapshotPeriod } from '@prisma/client'

const parseOptionalDate = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
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
    parseOptionalDate,
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