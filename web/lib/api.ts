import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sig_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

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

export type ApiError = {
  message: string
  statusCode: number
}

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

// Proventos
export type DividendEvent = {
  ticker: string
  assetClass: string
  paymentDate: string
  netAmount: number
}

export type DividendByClass = {
  code: string
  total: number
}

export type DividendByMonth = {
  month: string
  total: number
  byClass: DividendByClass[]
  events: DividendEvent[]
}

export type DividendAvgPerYear = {
  year: number
  total: number
  avgPerMonth: number
}

export type DividendSummary = {
  year: number
  totalYear: number
  avgPerMonth: number
  byMonth: DividendByMonth[]
  last12Months: { month: string; total: number }[]
  avgPerYear: DividendAvgPerYear[]
}

// Performance — GET /performance/summary
export type PerformanceSummary = {
  startReferenceDate: string
  endReferenceDate: string
  requestedStartDate: string
  requestedEndDate: string
  period: 'DAILY' | 'WEEKLY'
  initialMarketValue: number
  finalMarketValue: number
  netContributions: number
  capitalGain: number
  absoluteChange: number
  returnPercentage: number | null
}

// Performance — GET /performance/timeline
export type TimelinePoint = {
  referenceDate: string
  period: string
  totalInvested: number
  totalMarketValue: number
  totalProfitLoss: number
  totalProfitLossPct: number | null
  totalIncome: number
  cashBalance: number
}

export type PerformanceTimeline = {
  requestedStartDate: string
  requestedEndDate: string
  period: string
  points: TimelinePoint[]
  chart: {
    labels: string[]
    series: {
      totalInvested: number[]
      totalMarketValue: number[]
      totalProfitLoss: number[]
      totalIncome: number[]
      cashBalance: number[]
    }
  }
}

// Performance — GET /performance/by-class
export type PerformanceByClassItem = {
  assetClassId: string
  code: string
  name: string
  investedAmount: number
  marketValue: number
  profitLoss: number
  currentPercentage: number | null
  targetPercentage: number | null
  rebalanceDifference: number | null
  suggestedContribution: number | null
}

export type PerformanceByClass = {
  requestedEndDate: string
  snapshotReferenceDate: string
  period: string
  classes: PerformanceByClassItem[]
}
