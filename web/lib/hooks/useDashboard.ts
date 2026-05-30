'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  PortfolioSnapshot,
  AllocationItem,
  PerformanceData,
  DividendSummary,
} from '@/lib/api'

// Últimos N snapshots DAILY ordenados por data
export function useSnapshots(limit = 90) {
  return useQuery<PortfolioSnapshot[]>({
    queryKey: ['snapshots', limit],
    queryFn: async () => {
      const res = await api.get<PortfolioSnapshot[]>('/portfolio-snapshots', {
        params: { period: 'DAILY', limit, orderBy: 'snapshotDate', order: 'asc' },
      })
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Alocação atual por classe — endpoint: POST /allocation/calculate
export function useAllocation() {
  return useQuery<AllocationItem[]>({
    queryKey: ['allocation'],
    queryFn: async () => {
      const res = await api.post<AllocationItem[]>('/allocation/calculate')
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Performance geral da carteira — endpoint: GET /performance/summary
export function usePerformance() {
  return useQuery<PerformanceData>({
    queryKey: ['performance'],
    queryFn: async () => {
      const res = await api.get<PerformanceData>('/performance/summary')
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Proventos recebidos — endpoint: GET /dividends/summary
export function useDividends(year?: number) {
  return useQuery<DividendSummary>({
    queryKey: ['dividends', year],
    queryFn: async () => {
      const res = await api.get<DividendSummary>('/dividends/summary', {
        params: year ? { year } : {},
      })
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Gerar snapshots para um range de datas
export function useGenerateSnapshotRange() {
  return useMutation({
    mutationFn: async (payload: { startDate: string; endDate: string; period?: string }) => {
      const res = await api.post('/portfolio-snapshots/generate-range', payload)
      return res.data as { generated: number; skipped: number; errors: number }
    },
  })
}
