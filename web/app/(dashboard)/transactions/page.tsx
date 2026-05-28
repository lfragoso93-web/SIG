'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  ArrowLeftRight, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Minus, AlertCircle, RefreshCw,
} from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { fmt } from '@/lib/utils'
import { useTransactions, type Transaction } from '@/lib/hooks/useTransactions'

// ── Helpers ──────────────────────────────────────────────────────────────────

function toNum(v: string | number | undefined): number {
  if (v == null) return 0
  return typeof v === 'string' ? parseFloat(v) : v
}

function txValue(tx: Transaction): number {
  return toNum(tx.grossAmount)
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--color-surface-offset)] rounded animate-pulse ${className}`} />
}

// ── Tooltip do gráfico ───────────────────────────────────────────────────────

function BarTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; fill: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 shadow-lg text-xs space-y-1">
      <p className="text-[var(--color-text-muted)] font-medium mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
            {p.name}
          </span>
          <span className="tabular-nums font-medium">{fmt.currency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Badge BUY / SELL ─────────────────────────────────────────────────────────

function TxBadge({ type }: { type: string }) {
  return (
    <span className={`
      inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide
      ${type === 'BUY'
        ? 'bg-emerald-500/15 text-emerald-400'
        : 'bg-red-500/15 text-red-400'}
    `}>
      {type === 'BUY' ? '↑ COMPRA' : '↓ VENDA'}
    </span>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const { data, isLoading, isError, refetch } = useTransactions()
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))

  // Gráfico: últimos 12 meses
  const chartData = useMemo(() => {
    if (!data) return []
    return Array.from({ length: 12 }, (_, i) => {
      const monthStart = startOfMonth(subMonths(new Date(), 11 - i))
      const monthEnd   = endOfMonth(monthStart)
      const label      = format(monthStart, 'MMM/yy', { locale: ptBR })
      const inMonth    = data.filter((tx) => {
        const d = parseISO(tx.tradeDate)
        return isWithinInterval(d, { start: monthStart, end: monthEnd })
      })
      const buys  = inMonth.filter((t) => t.type === 'BUY').reduce((s, t) => s + txValue(t), 0)
      const sells = inMonth.filter((t) => t.type === 'SELL').reduce((s, t) => s + txValue(t), 0)
      return { label, buys, sells }
    })
  }, [data])

  // Transações do mês selecionado
  const monthInterval = useMemo(() => ({
    start: currentMonth,
    end: endOfMonth(currentMonth),
  }), [currentMonth])

  const monthTxs = useMemo(() => {
    if (!data) return []
    return data.filter((tx) => isWithinInterval(parseISO(tx.tradeDate), monthInterval))
  }, [data, monthInterval])

  // KPIs do mês
  const totalBuy  = monthTxs.filter((t) => t.type === 'BUY').reduce((s, t)  => s + txValue(t), 0)
  const totalSell = monthTxs.filter((t) => t.type === 'SELL').reduce((s, t) => s + txValue(t), 0)
  const netMonth  = totalBuy - totalSell

  // Agrupar por classe de ativo
  const grouped = useMemo(() => {
    const map = new Map<string, { className: string; transactions: Transaction[] }>()
    monthTxs.forEach((tx) => {
      const key  = tx.asset?.assetClass?.name ?? 'Sem classe'
      const item = map.get(key) ?? { className: key, transactions: [] }
      item.transactions.push(tx)
      map.set(key, item)
    })
    return Array.from(map.values()).sort((a, b) => a.className.localeCompare(b.className))
  }, [monthTxs])

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: ptBR })
  const monthLabelCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-xs mb-1">
          <ArrowLeftRight size={13} />
          <span>Transações</span>
        </div>
        <h1 className="text-xl font-semibold">Transações</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Histórico de compras e vendas</p>
      </div>

      {/* Gráfico 12 meses */}
      <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5 mb-6">
        <p className="text-sm font-medium mb-5">
          Movimentações
          <span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">últimos 12 meses</span>
        </p>
        {isLoading && <Skeleton className="h-48 w-full" />}
        {isError && (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-[var(--color-text-faint)]">
            <AlertCircle size={24} />
            <p className="text-sm">Erro ao carregar dados.</p>
          </div>
        )}
        {!isLoading && !isError && (
          <ResponsiveContainer width="100%" height={192}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={10}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--color-text-faint)' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10, fill: 'var(--color-text-faint)' }}
                axisLine={false} tickLine={false} width={52}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--color-surface-offset)', radius: 4 }} />
              <Legend
                iconType="circle" iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 12, color: 'var(--color-text-muted)' }}
                formatter={(v) => v === 'buys' ? 'Compras' : 'Vendas'}
              />
              <Bar dataKey="buys"  name="buys"  fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sells" name="sells" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* KPIs + Navegação de mês */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentMonth((m) => startOfMonth(subMonths(m, 1)))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-offset)] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-[140px] text-center">{monthLabelCapitalized}</span>
          <button
            onClick={() => setCurrentMonth((m) => startOfMonth(subMonths(m, -1)))}
            disabled={currentMonth >= startOfMonth(new Date())}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-offset)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex gap-3">
          {[
            { label: 'Aportes', value: totalBuy,  icon: TrendingUp,   color: 'text-emerald-400' },
            { label: 'Vendas',  value: totalSell, icon: TrendingDown, color: 'text-red-400'     },
            { label: 'Saldo',   value: netMonth,  icon: Minus,        color: netMonth >= 0 ? 'text-emerald-400' : 'text-red-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} className={color} />
                <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
              </div>
              {isLoading
                ? <Skeleton className="h-4 w-20" />
                : <p className={`text-sm font-semibold tabular-nums ${color}`}>{fmt.currency(value)}</p>
              }
            </div>
          ))}
        </div>
      </div>

      {/* Lista agrupada por classe */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-4 space-y-3">
              <Skeleton className="h-4 w-32" />
              {[1, 2, 3].map((j) => <Skeleton key={j} className="h-10 w-full" />)}
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <AlertCircle size={28} className="text-[var(--color-error)]" />
          <p className="text-sm text-[var(--color-text-muted)]">Não foi possível carregar as transações.</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:opacity-80"
          >
            <RefreshCw size={12} /> Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !isError && grouped.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--color-surface-offset)] flex items-center justify-center">
            <ArrowLeftRight size={20} className="text-[var(--color-text-faint)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-text-muted)]">Nenhuma transação em {monthLabelCapitalized}</p>
          <p className="text-xs text-[var(--color-text-faint)]">Use o botão + para registrar um lançamento</p>
        </div>
      )}

      {!isLoading && !isError && grouped.length > 0 && (
        <div className="space-y-4">
          {grouped.map(({ className, transactions }) => {
            const groupBuy  = transactions.filter((t) => t.type === 'BUY').reduce((s, t) => s + txValue(t), 0)
            const groupSell = transactions.filter((t) => t.type === 'SELL').reduce((s, t) => s + txValue(t), 0)
            return (
              <div
                key={className}
                className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden"
              >
                {/* Cabeçalho do grupo */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    {className}
                  </span>
                  <div className="flex gap-4 text-xs tabular-nums">
                    {groupBuy > 0 && <span className="text-emerald-400">+{fmt.currency(groupBuy)}</span>}
                    {groupSell > 0 && <span className="text-red-400">-{fmt.currency(groupSell)}</span>}
                  </div>
                </div>

                {/* Linhas */}
                <div className="divide-y divide-[var(--color-border-subtle)]">
                  {transactions
                    .slice()
                    .sort((a, b) => parseISO(b.tradeDate).getTime() - parseISO(a.tradeDate).getTime())
                    .map((tx) => (
                      <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-offset)] transition-colors">
                        <TxBadge type={tx.type} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{tx.asset?.ticker ?? '—'}</p>
                          <p className="text-xs text-[var(--color-text-faint)] truncate">{tx.asset?.name}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-[var(--color-text-muted)]">{fmt.date(tx.tradeDate)}</p>
                          <p className="text-xs tabular-nums text-[var(--color-text-muted)]">
                            {fmt.number(toNum(tx.quantity), 0)} × {fmt.currency(toNum(tx.unitPrice))}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 min-w-[80px]">
                          <p className={`text-sm font-semibold tabular-nums ${
                            tx.type === 'BUY' ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {tx.type === 'BUY' ? '+' : '-'}{fmt.currency(txValue(tx))}
                          </p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
