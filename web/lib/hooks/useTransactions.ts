import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// ── Types ────────────────────────────────────────────────────────────────────

export interface Asset {
  id: string
  ticker: string
  name: string
  assetClassId: string
  assetType: string
  currencyCode?: string
  exchange?: string
  assetClass?: { id: string; code: string; name: string }
}

export interface AssetClass {
  id: string
  code: string
  name: string
  displayOrder: number
}

export interface Transaction {
  id: string
  type: 'BUY' | 'SELL'
  status: string
  tradeDate: string
  quantity: string | number
  unitPrice: string | number
  grossAmount: string | number
  fees?: string | number
  assetId?: string
  accountId?: string
  asset?: Asset
}

export interface CreateTransactionPayload {
  type: 'BUY' | 'SELL'
  assetId: string
  tradeDate: string
  quantity: number
  unitPrice: number
  grossAmount: number
  fees?: number
  status?: string
}

export interface CreateAssetPayload {
  ticker: string
  name: string
  assetClassId: string
  assetType: string
  currencyCode?: string
  exchange?: string
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useTransactions() {
  return useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data } = await api.get('/transactions')
      return data
    },
  })
}

export function useAssetClasses() {
  return useQuery<AssetClass[]>({
    queryKey: ['asset-classes'],
    queryFn: async () => {
      const { data } = await api.get('/asset-classes')
      return data
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useAssetByTicker(ticker: string) {
  return useQuery<Asset | null>({
    queryKey: ['asset-by-ticker', ticker],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/assets/ticker/${ticker.toUpperCase()}`)
        return data as Asset
      } catch (e: unknown) {
        const err = e as { response?: { status?: number } }
        if (err?.response?.status === 404) return null
        throw e
      }
    },
    enabled: ticker.length >= 2,
    retry: false,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateAssetPayload) => {
      const { data } = await api.post('/assets', payload)
      return data as Asset
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateTransactionPayload) => {
      const { data } = await api.post('/transactions', payload)
      return data as Transaction
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['portfolio-items'] })
      qc.invalidateQueries({ queryKey: ['allocation'] })
      qc.invalidateQueries({ queryKey: ['portfolio-allocation'] })
      qc.invalidateQueries({ queryKey: ['performance'] })
      qc.invalidateQueries({ queryKey: ['portfolio-performance'] })
    },
  })
}
