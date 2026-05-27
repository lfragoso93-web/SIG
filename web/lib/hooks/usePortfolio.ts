import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PortfolioItem, PortfolioSnapshot, AllocationItem, PerformanceData } from '@/lib/api'

export function usePortfolioItems() {
  return useQuery<PortfolioItem[]>({
    queryKey: ['portfolio-items'],
    queryFn:  () => api.get('/portfolio-items').then(r => r.data),
    staleTime: 1000 * 60 * 5,
  })
}

export function useSnapshots(period: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'DAILY') {
  return useQuery<PortfolioSnapshot[]>({
    queryKey: ['portfolio-snapshots', period],
    queryFn:  () => api.get('/portfolio-snapshots', { params: { period } }).then(r => r.data),
    staleTime: 1000 * 60 * 5,
  })
}

// Nota: usa POST /allocation/calculate (mesmo endpoint do useDashboard)
export function useAllocation() {
  return useQuery<AllocationItem[]>({
    queryKey: ['portfolio-allocation'],
    queryFn:  () => api.post('/allocation/calculate').then(r => r.data),
    staleTime: 1000 * 60 * 5,
  })
}

export function usePerformance() {
  return useQuery<PerformanceData>({
    queryKey: ['portfolio-performance'],
    queryFn:  () => api.get('/performance/summary').then(r => r.data),
    staleTime: 1000 * 60 * 5,
  })
}
