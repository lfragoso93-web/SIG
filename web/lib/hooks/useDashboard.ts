import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface SnapshotSummary {
  referenceDate:      string
  period:             string
  totalValue:         number
  totalInvested:      number
  unrealizedPnL:      number
  unrealizedPnLPct:   number
  snapshotDate:       string
}

export interface AllocationItem {
  assetClassCode:    string
  assetClassName:    string
  currentValue:      number
  currentPercent:    number
  targetPercent:     number | null
  rebalanceDiff:     number | null
}

export interface PerformanceSummary {
  totalInvested:   number
  totalMarketValue: number
  absoluteReturn:  number
  percentReturn:   number
}

export interface DividendSummary {
  totalYear:    number
  avgPerMonth:  number
}

// ── Hooks de leitura ──────────────────────────────────────────────────────────

export function useSnapshots(days = 90) {
  return useQuery({
    queryKey: ['snapshots', days],
    queryFn:  async () => {
      const from = new Date()
      from.setDate(from.getDate() - days)
      const res = await api.get('/portfolio-snapshots', {
        params: { from: from.toISOString().slice(0, 10), period: 'DAILY' },
      })
      return res.data as SnapshotSummary[]
    },
  })
}

export function useAllocation() {
  return useQuery({
    queryKey: ['allocation'],
    queryFn:  async () => {
      const res = await api.get('/portfolio/allocation')
      return res.data as AllocationItem[]
    },
  })
}

export function usePerformance() {
  return useQuery({
    queryKey: ['performance'],
    queryFn:  async () => {
      const res = await api.get('/portfolio/performance')
      return res.data as PerformanceSummary
    },
  })
}

export function useDividends() {
  return useQuery({
    queryKey: ['dividends-summary'],
    queryFn:  async () => {
      const res = await api.get('/income-events/summary')
      return res.data as DividendSummary
    },
  })
}

// ── Gerar snapshots para um range de datas ────────────────────────────────────

export function useGenerateSnapshotRange() {
  return useMutation({
    mutationFn: async (payload: { startDate: string; endDate: string; period?: string }) => {
      const res = await api.post('/portfolio-snapshots/generate-range', payload)
      return res.data as { generated: number; skipped: number; errors: number; errorDetails?: { date: string; error: string }[] }
    },
  })
}
