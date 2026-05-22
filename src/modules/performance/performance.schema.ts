import { z } from 'zod'
import { SnapshotPeriod } from '@prisma/client'

const parseIsoDateOnlyToUtcDate = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return new Date(`${trimmed}T00:00:00.000Z`)
    return value
  }
  return value
}

export const performanceSummaryQuerySchema = z.object({
  startDate: z.preprocess(parseIsoDateOnlyToUtcDate, z.date()),
  endDate:   z.preprocess(parseIsoDateOnlyToUtcDate, z.date()),
  period:    z.nativeEnum(SnapshotPeriod).optional().default(SnapshotPeriod.WEEKLY),
}).refine((d) => d.startDate <= d.endDate, {
  message: 'startDate deve ser menor ou igual a endDate',
  path: ['startDate'],
})

export const performanceTimelineQuerySchema = z.object({
  startDate: z.preprocess(parseIsoDateOnlyToUtcDate, z.date()),
  endDate:   z.preprocess(parseIsoDateOnlyToUtcDate, z.date()),
  period:    z.nativeEnum(SnapshotPeriod).optional().default(SnapshotPeriod.WEEKLY),
}).refine((d) => d.startDate <= d.endDate, {
  message: 'startDate deve ser menor ou igual a endDate',
  path: ['startDate'],
})

export const performanceByClassQuerySchema = z.object({
  endDate: z.preprocess(parseIsoDateOnlyToUtcDate, z.date()),
  monthlyContribution: z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return undefined
    if (typeof v === 'string') return Number(v.replace(',', '.'))
    return v
  }, z.number().nonnegative().optional().default(0)),
  period: z.nativeEnum(SnapshotPeriod).optional().default(SnapshotPeriod.WEEKLY),
})

export const monthlyReportQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month deve estar no formato YYYY-MM'),
  monthlyContribution: z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return undefined
    if (typeof v === 'string') return Number(v.replace(',', '.'))
    return v
  }, z.number().nonnegative().optional().default(0)),
})

export type PerformanceSummaryQueryInput  = z.infer<typeof performanceSummaryQuerySchema>
export type PerformanceTimelineQueryInput = z.infer<typeof performanceTimelineQuerySchema>
export type PerformanceByClassQueryInput  = z.infer<typeof performanceByClassQuerySchema>
export type MonthlyReportQueryInput       = z.infer<typeof monthlyReportQuerySchema>
