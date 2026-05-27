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

// Alocação atual por classe
export function useAllocation() {
  return useQuery<AllocationItem[]>({
    queryKey: ['allocation'],
    queryFn: async () => {
      const res = await api.get<AllocationItem[]>('/allocation')
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Performance geral da carteira
export function usePerformance() {
  return useQuery<PerformanceData>({
    queryKey: ['performance'],
    queryFn: async () => {
      const res = await api.get<PerformanceData>('/performance')
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Proventos recebidos
export function useDividends() {
  return useQuery<DividendSummary>({
    queryKey: ['dividends'],
    queryFn: async () => {
      const res = await api.get<DividendSummary>('/dividends')
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}
