'use client'

import { useQuery } from '@tanstack/react-query'
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
export function useDividends() {
  return useQuery<DividendSummary>({
    queryKey: ['dividends'],
    queryFn: async () => {
      const res = await api.get<DividendSummary>('/dividends/summary')
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}
