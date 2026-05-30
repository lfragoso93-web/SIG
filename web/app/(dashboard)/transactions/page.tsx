'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  ArrowLeftRight, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Minus, AlertCircle, RefreshCw,
  Search, Filter, Pencil, Trash2, X, ChevronLeftIcon, ChevronRightIcon,
} from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { fmt } from '@/lib/utils'
import {
  useTransactions,
  useDeleteTransaction,
  type Transaction,
} from '@/lib/hooks/useTransactions'
import { EditTransactionDrawer } from '@/components/transactions/EditTransactionDrawer'

const PAGE_SIZE = 20

function toNum(v: string | number | undefined): number {
  if (v == null) return 0
  return typeof v === 'string' ? parseFloat(v) : v
}

function txValue(tx: Transaction): number {
  return toNum(tx.grossAmount)
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--color-surface-offset)] rounded animate-pulse ${className}`} />
}

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

export default function TransactionsPage() {
  const { data, isLoading, isError, refetch } = useTransactions()
  const deleteTx = useDeleteTransaction()

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [editTarget,   setEditTarget]   = useState<Transaction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [page,         setPage]         = useState(1)

  // Filtros
  const [search,      setSearch]      = useState('')
  const [filterType,  setFilterType]  = useState<'ALL' | 'BUY' | 'SELL'>('ALL')
  const [filterClass, setFilterClass] = useState('ALL')

  // Classes disponíveis para o filtro
  const availableClasses = useMemo(() => {
    if (!data) return []
    const set = new Set<string>()
    data.forEach((tx) => {
      const name = tx.asset?.assetClass?.name
      if (name) set.add(name)
    })
    return Array.from(set).sort()
  }, [data])

  // Gráfico 12 meses (sem filtros)
  const chartData = useMemo(() => {
    if (!data) return []
    return Array.from({ length: 12 }, (_, i) => {
      const monthStart = startOfMonth(subMonths(new Date(), 11 - i))
      const monthEnd   = endOfMonth(monthStart)
      const label      = format(monthStart, 'MMM/yy', { locale: ptBR })
      const inMonth    = data.filter((tx) =>
        isWithinInterval(parseISO(tx.tradeDate), { start: monthStart, end: monthEnd })
      )
      const buys  = inMonth.filter((t) => t.type === 'BUY').reduce((s, t)  => s + txValue(t), 0)
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

  // Filtros aplicados sobre o mês selecionado
  const filtered = useMemo(() => {
    let list = monthTxs
    if (filterType !== 'ALL')    list = list.filter((t) => t.type === filterType)
    if (filterClass !== 'ALL')   list = list.filter((t) => t.asset?.assetClass?.name === filterClass)
    if (search.trim().length > 0) {
      const q = search.trim().toUpperCase()
      list = list.filter((t) =>
        t.asset?.ticker?.toUpperCase().includes(q) ||
        t.asset?.name?.toUpperCase().includes(q)
      )
    }
    return list.slice().sort((a, b) =>
      parseISO(b.tradeDate).getTime() - parseISO(a.tradeDate).getTime()
    )
  }, [monthTxs, filterType, filterClass, search])

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const resetFilters = () => {
    setSearch(''); setFilterType('ALL'); setFilterClass('ALL'); setPage(1)
  }
  const hasActiveFilters = search || filterType !== 'ALL' || filterClass !== 'ALL'

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: ptBR })
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  const handleDelete = async (id: string) => {
    setDeleteTarget(id)
    try {
      await deleteTx.mutateAsync(id)
    } finally {
      setDeleteTarget(null)
    }
  }

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

      {/* Navegação de mês + KPIs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setCurrentMonth((m) => startOfMonth(subMonths(m, 1))); setPage(1) }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-offset)] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-[140px] text-center">{monthLabelCap}</span>
          <button
            onClick={() => { setCurrentMonth((m) => startOfMonth(subMonths(m, -1))); setPage(1) }}
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

      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {/* Busca */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)] pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value.toUpperCase()); setPage(1) }}
            placeholder="Buscar por ticker ou nome…"
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>

        {/* Tipo */}
        <div className="flex items-center gap-1 bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-lg p-1">
          {(['ALL', 'BUY', 'SELL'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setFilterType(t); setPage(1) }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterType === t
                  ? t === 'BUY' ? 'bg-emerald-500/15 text-emerald-400'
                  : t === 'SELL' ? 'bg-red-500/15 text-red-400'
                  : 'bg-[var(--color-surface-offset)] text-[var(--color-text)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {t === 'ALL' ? 'Todos' : t === 'BUY' ? 'Compras' : 'Vendas'}
            </button>
          ))}
        </div>

        {/* Classe */}
        {availableClasses.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Filter size={12} className="text-[var(--color-text-faint)]" />
            <select
              value={filterClass}
              onChange={(e) => { setFilterClass(e.target.value); setPage(1) }}
              className="text-xs rounded-lg px-2.5 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="ALL">Todas as classes</option>
              {availableClasses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {/* Limpar filtros */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors"
          >
            <X size={12} /> Limpar
          </button>
        )}
      </div>

      {/* Resultado dos filtros */}
      {hasActiveFilters && (
        <p className="text-xs text-[var(--color-text-faint)] mb-3">
          {filtered.length} transaç{filtered.length === 1 ? 'ão' : 'ões'} encontrada{filtered.length === 1 ? '' : 's'}
        </p>
      )}

      {/* Estados de carregamento / erro / vazio */}
      {isLoading && (
        <div className="space-y-3">
          {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
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

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--color-surface-offset)] flex items-center justify-center">
            <ArrowLeftRight size={20} className="text-[var(--color-text-faint)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-text-muted)]">
            {hasActiveFilters ? 'Nenhuma transação para os filtros selecionados.' : `Nenhuma transação em ${monthLabelCap}`}
          </p>
          {!hasActiveFilters && (
            <p className="text-xs text-[var(--color-text-faint)]">Use o botão + para registrar um lançamento</p>
          )}
        </div>
      )}

      {/* Tabela de transações */}
      {!isLoading && !isError && paginated.length > 0 && (
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)]">
                {['Tipo', 'Ativo', 'Classe', 'Data', 'Qtd × Preço', 'Total', 'Taxas', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {paginated.map((tx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-[var(--color-surface-offset)] transition-colors group"
                >
                  <td className="px-4 py-3"><TxBadge type={tx.type} /></td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{tx.asset?.ticker ?? '—'}</p>
                    <p className="text-[var(--color-text-faint)] truncate max-w-[140px]">{tx.asset?.name}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] whitespace-nowrap">
                    {tx.asset?.assetClass?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] whitespace-nowrap">
                    {fmt.date(tx.tradeDate)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[var(--color-text-muted)] whitespace-nowrap">
                    {fmt.number(toNum(tx.quantity), 0)} × {fmt.currency(toNum(tx.unitPrice))}
                  </td>
                  <td className={`px-4 py-3 tabular-nums font-semibold whitespace-nowrap ${
                    tx.type === 'BUY' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {tx.type === 'BUY' ? '+' : '-'}{fmt.currency(txValue(tx))}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[var(--color-text-faint)] whitespace-nowrap">
                    {toNum(tx.fees) > 0 ? fmt.currency(toNum(tx.fees)) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditTarget(tx)}
                        title="Editar"
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        disabled={deleteTarget === tx.id}
                        title="Excluir"
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border-subtle)]">
              <p className="text-xs text-[var(--color-text-faint)]">
                {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-offset)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="w-7 text-center text-xs text-[var(--color-text-faint)]">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                          safePage === p
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'hover:bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-offset)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRightIcon size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drawer de edição */}
      <EditTransactionDrawer
        transaction={editTarget}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
      />
    </div>
  )
}
