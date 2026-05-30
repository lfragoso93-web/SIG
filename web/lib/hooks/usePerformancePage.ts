'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  PerformanceSummary,
  PerformanceTimeline,
  PerformanceByClass,
} from '@/lib/api'

const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function usePerformanceSummary(startDate: string, endDate: string, period = 'DAILY') {
  return useQuery<PerformanceSummary>({
    queryKey: ['perf-summary', startDate, endDate, period],
    queryFn: async () => {
      const res = await api.get<PerformanceSummary>('/performance/summary', {
        params: { startDate, endDate, period },
      })
      return res.data
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function usePerformanceTimeline(startDate: string, endDate: string, period = 'DAILY') {
  return useQuery<PerformanceTimeline>({
    queryKey: ['perf-timeline', startDate, endDate, period],
    queryFn: async () => {
      const res = await api.get<PerformanceTimeline>('/performance/timeline', {
        params: { startDate, endDate, period },
      })
      return res.data
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function usePerformanceByClass(endDate?: string, period = 'DAILY') {
  const end = endDate ?? today()
  return useQuery<PerformanceByClass>({
    queryKey: ['perf-by-class', end, period],
    queryFn: async () => {
      const res = await api.get<PerformanceByClass>('/performance/by-class', {
        params: { endDate: end, period },
      })
      return res.data
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export { today, daysAgo }
