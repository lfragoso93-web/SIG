export type MonthlyCapitalGain = {
  month: string
  classCode: string
  className: string
  hasDayTrade: boolean
  grossSales: number
  costBasis: number
  profit: number
  lossCarryIn: number
  taxableBase: number
  irDue: number
  isExempt: boolean
}

export type IncomeRow = {
  ticker: string
  assetName: string
  classCode: string
  className: string
  type: string
  totalGross: number
  irWithheld: number
  netAmount: number
  isExempt: boolean
  paymentMonth: string
}

export type PositionRow = {
  ticker: string
  assetName: string
  classCode: string
  className: string
  quantity: number
  averageCost: number
  totalCost: number
  marketValue: number
}

export type DarfRow = {
  month: string
  classGroup: string
  taxableBase: number
  irDue: number
  rate: number
  dueDate: string
}

export type IrpfSummary = {
  year: number
  totalGainSwing: number
  totalGainDayTrade: number
  totalIrDue: number
  totalIrWithheld: number
  totalExemptIncome: number
  totalTaxableIncome: number
  lossCarryForward: number
  monthlyGains: MonthlyCapitalGain[]
  incomeRows: IncomeRow[]
  positions: PositionRow[]
  darfs: DarfRow[]
}
