import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

// Request: injeta JWT em toda requisição autenticada
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sig_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response: redireciona para /login em 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('sig_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

// ---- Helpers de tipo ----
export type ApiError = {
  message: string
  statusCode: number
}

// ---- Tipagens das respostas da API ----
export type PortfolioSnapshot = {
  id: string
  snapshotDate: string
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  totalValue: number
  totalCost: number
  unrealizedPnL: number
  realizedPnL: number
  totalDividends: number
}

export type PortfolioItem = {
  id: string
  assetId: string
  asset: { ticker: string; name: string; assetClass: { code: string; name: string } }
  quantity: number
  averagePrice: number
  marketPrice: number
  marketValue: number
  investedAmount: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
}

export type TreasuryPosition = {
  assetId: string
  bondName: string
  indexer: string
  maturityDate: string
  quantity: number
  investedAmount: number
  redeemUnitPrice: number
  marketValue: number
  grossPnL: number
  irRate: number
  iofRate: number
  irAmount: number
  iofAmount: number
  netPnL: number
  netValue: number
  lastPriceDate: string
}

export type FixedIncomePosition = {
  assetId: string
  ticker: string
  issuer: string
  assetSubtype: string
  indexer: string
  purchaseRate: number
  purchaseDate: string
  maturityDate: string
  principal: number
  grossValue: number
  grossPnL: number
  irRate: number
  iofRate: number
  irAmount: number
  iofAmount: number
  netPnL: number
  netValue: number
  daysElapsed: number
  isExempt: boolean
  lastUpdatedAt: string
}

export type AllocationItem = {
  assetClassCode: string
  assetClassName: string
  currentValue: number
  currentPercent: number
  targetPercent: number | null
  diff: number | null
}

export type PerformanceData = {
  totalInvested: number
  currentValue: number
  absoluteReturn: number
  percentReturn: number
  periodStart: string
  periodEnd: string
}
