import { describe, it, expect } from 'vitest'
import { getPagination, paginatedResponse } from '../pagination'
import type { Request } from 'express'

function makeReq(query: Record<string, string> = {}): Request {
  return { query } as unknown as Request
}

describe('getPagination', () => {
  it('retorna defaults quando query está vazia', () => {
    const opts = getPagination(makeReq())
    expect(opts).toEqual({ page: 1, limit: 50, skip: 0 })
  })

  it('calcula skip corretamente', () => {
    const opts = getPagination(makeReq({ page: '3', limit: '20' }))
    expect(opts).toEqual({ page: 3, limit: 20, skip: 40 })
  })

  it('força page mínimo = 1 para valores inválidos', () => {
    const opts = getPagination(makeReq({ page: '-5', limit: '10' }))
    expect(opts.page).toBe(1)
    expect(opts.skip).toBe(0)
  })

  it('respeita o limite máximo de 200', () => {
    const opts = getPagination(makeReq({ limit: '999' }))
    expect(opts.limit).toBe(200)
  })

  it('força limit mínimo = 1', () => {
    const opts = getPagination(makeReq({ limit: '0' }))
    expect(opts.limit).toBe(1)
  })
})

describe('paginatedResponse', () => {
  it('calcula totalPages corretamente', () => {
    const result = paginatedResponse([1, 2, 3], 103, { page: 2, limit: 10, skip: 10 })
    expect(result.meta.totalPages).toBe(11)
    expect(result.meta.total).toBe(103)
    expect(result.data).toHaveLength(3)
  })

  it('retorna totalPages = 1 quando total <= limit', () => {
    const result = paginatedResponse([], 5, { page: 1, limit: 50, skip: 0 })
    expect(result.meta.totalPages).toBe(1)
  })
})
