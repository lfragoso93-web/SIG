/**
 * Lógica pura de cálculo de posição e preço médio ponderado.
 * Separada do Prisma para ser facilmente testável.
 *
 * Regras:
 *  - BUY / BONUS / SPLIT  → aumentam quantidade; apenas BUY soma custo
 *  - SELL / REVERSE_SPLIT → diminuem quantidade e realizam P&L
 *  - Outros tipos (FEE, TAX, TRANSFER_IN…) são ignorados neste cálculo
 */

export type CalcTx = {
  type:       string
  quantity:   string | number | null | undefined
  unitPrice:  string | number | null | undefined
}

export type PositionResult = {
  quantity:    number
  totalCost:   number
  realizedPnL: number
}

function toNum(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return val
  return parseFloat(String(val))
}

const BUY_TYPES        = new Set(['BUY'])
const FREE_TYPES       = new Set(['BONUS', 'SPLIT'])    // aumentam qty, custo zero
const SELL_TYPES       = new Set(['SELL', 'REVERSE_SPLIT'])

export function calcPositionFromTxs(transactions: CalcTx[]): PositionResult {
  let quantity    = 0
  let totalCost   = 0
  let realizedPnL = 0

  for (const tx of transactions) {
    const qty   = toNum(tx.quantity)
    const price = toNum(tx.unitPrice)

    if (qty <= 0) continue

    if (BUY_TYPES.has(tx.type)) {
      totalCost += qty * price
      quantity  += qty
    } else if (FREE_TYPES.has(tx.type)) {
      // Quantidade aumenta mas custo não muda (PM dilui)
      quantity += qty
    } else if (SELL_TYPES.has(tx.type)) {
      if (quantity > 0) {
        const avgPrice   = totalCost / quantity
        const costOfSold = qty * avgPrice
        realizedPnL += qty * price - costOfSold
        totalCost   -= costOfSold
        quantity    -= qty
        if (quantity < 1e-8) { quantity = 0; totalCost = 0 }
      }
    }
    // FEE, TAX, TRANSFER_IN, TRANSFER_OUT, AMORTIZATION, OTHER → ignorados
  }

  return { quantity, totalCost, realizedPnL }
}
