import { describe, it, expect } from 'vitest'
import { calcPositionFromTxs } from '../portfolio-items.calc'

describe('calcPositionFromTxs — preço médio ponderado', () => {
  it('compra simples', () => {
    const result = calcPositionFromTxs([
      { type: 'BUY', quantity: '100', unitPrice: '10.00' },
    ])
    expect(result.quantity).toBe(100)
    expect(result.totalCost).toBeCloseTo(1000)
    expect(result.realizedPnL).toBe(0)
  })

  it('duas compras calculam preço médio correto', () => {
    const result = calcPositionFromTxs([
      { type: 'BUY', quantity: '100', unitPrice: '10.00' },
      { type: 'BUY', quantity: '100', unitPrice: '20.00' },
    ])
    // PM = (1000 + 2000) / 200 = 15
    expect(result.quantity).toBe(200)
    expect(result.totalCost).toBeCloseTo(3000)
  })

  it('venda parcial realiza lucro corretamente', () => {
    const result = calcPositionFromTxs([
      { type: 'BUY',  quantity: '100', unitPrice: '10.00' },
      { type: 'SELL', quantity: '50',  unitPrice: '15.00' },
    ])
    // Custo vendido: 50 * 10 = 500; Receita: 50 * 15 = 750; PnL = 250
    expect(result.quantity).toBeCloseTo(50)
    expect(result.realizedPnL).toBeCloseTo(250)
    expect(result.totalCost).toBeCloseTo(500)
  })

  it('venda total zera posição', () => {
    const result = calcPositionFromTxs([
      { type: 'BUY',  quantity: '100', unitPrice: '10.00' },
      { type: 'SELL', quantity: '100', unitPrice: '12.00' },
    ])
    expect(result.quantity).toBe(0)
    expect(result.totalCost).toBe(0)
    expect(result.realizedPnL).toBeCloseTo(200)
  })

  it('BONUS aumenta quantidade sem custo', () => {
    const result = calcPositionFromTxs([
      { type: 'BUY',   quantity: '100', unitPrice: '10.00' },
      { type: 'BONUS', quantity: '10',  unitPrice: '0.00'  },
    ])
    // BONUS: qty aumenta, custo não muda → PM cai
    expect(result.quantity).toBe(110)
    expect(result.totalCost).toBeCloseTo(1000)
  })

  it('SPLIT multiplica quantidade sem alterar custo total', () => {
    const result = calcPositionFromTxs([
      { type: 'BUY',   quantity: '10',  unitPrice: '100.00' },
      { type: 'SPLIT', quantity: '40',  unitPrice: '0.00'   },
    ])
    expect(result.quantity).toBe(50)
    expect(result.totalCost).toBeCloseTo(1000)
  })

  it('ignora venda quando posição é zero', () => {
    const result = calcPositionFromTxs([
      { type: 'SELL', quantity: '50', unitPrice: '20.00' },
    ])
    expect(result.quantity).toBe(0)
    expect(result.realizedPnL).toBe(0)
  })

  it('lista vazia retorna zeros', () => {
    const result = calcPositionFromTxs([])
    expect(result).toEqual({ quantity: 0, totalCost: 0, realizedPnL: 0 })
  })
})
