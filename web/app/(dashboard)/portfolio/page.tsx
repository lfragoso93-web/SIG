'use client'

import { useMemo, useState } from 'react'
import { Briefcase, TrendingUp, TrendingDown, Search, AlertCircle, RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { usePortfolioItems } from '@/lib/hooks/usePortfolio'
import { fmt } from '@/lib/utils'
import type { PortfolioItem } from '@/lib/api'

// ---- Skeleton ----
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--color-surface-3)] rounded animate-pulse ${className}`} />
}

// ---- Estado de erro ----
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertCircle size={28} className="text-[var(--color-error)]" />
      <p className="text-sm text-[var(--color-text-muted)] max-w-xs">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
      >
        <RefreshCw size={12} />
        Tentar novamente
      </button>
    </div>
  )
}

// ---- Empty state ----
function EmptyState({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-[var(--color-text-faint)]">
      <Briefcase size={32} />
      {search ? (
        <>
          <p className="text-sm">Nenhuma posição encontrada para &ldquo;{search}&rdquo;.</p>
          <p className="text-xs">Tente outro ticker ou nome.</p>
        </>
      ) : (
        <>
          <p className="text-sm">Nenhuma posição cadastrada.</p>
          <p className="text-xs">Adicione ativos via <code className="bg-[var(--color-surface-3)] px-1 rounded">POST /portfolio-items</code></p>
        </>
      )}
    </div>
  )
}

// ---- Badge de classe de ativo ----
const CLASS_COLORS: Record<string, string> = {
  STOCK:   'bg-indigo-500/10 text-indigo-400',
  FII:     'bg-emerald-500/10 text-emerald-400',
  ETF:     'bg-amber-500/10 text-amber-400',
  BDR:     'bg-blue-500/10 text-blue-400',
  CRYPTO:  'bg-purple-500/10 text-purple-400',
}
function ClassBadge({ code, name }: { code: string; name: string }) {
  const cls = CLASS_COLORS[code] ?? 'bg-[var(--color-surface-3)] text-[var(--color-text-muted)]'
  return (
    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${cls}`}>
      {name}
    </span>
  )
}

// ---- Indicador de variação ----
function PnLCell({ value, percent }: { value: number; percent: number }) {
  const positive = value >= 0
  const color = positive ? 'text-emerald-400' : 'text-rose-400'
  const Icon = positive ? TrendingUp : TrendingDown
  return (
    <div className={`flex flex-col items-end gap-0.5 ${color}`}>
      <span className="flex items-center gap-1 tabular-nums text-sm">
        <Icon size={13} />
        {fmt.currency(value)}
      </span>
      <span className="text-xs tabular-nums opacity-75">
        {positive ? '+' : ''}{fmt.percent(percent)}
      </span>
    </div>
  )
}

// ---- Tipos de ordenação ----
type SortKey = 'ticker' | 'marketValue' | 'unrealizedPnL' | 'unrealizedPnLPercent' | 'quantity'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown size={13} className="text-[var(--color-text-faint)]" />
  return dir === 'asc'
    ? <ChevronUp size={13} className="text-[var(--color-primary)]" />
    : <ChevronDown size={13} className="text-[var(--color-primary)]" />
}

function Th({
  label, col, sortKey, sortDir, onSort,
  align = 'left',
}: {
  label: string
  col: SortKey
  sortKey: SortKey
  sortDir: SortDir
  onSort: (c: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = sortKey === col
  return (
    <th
      className={`px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide cursor-pointer select-none whitespace-nowrap ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {align === 'right' && <SortIcon col={col} active={active} dir={sortDir} />}
        {label}
        {align === 'left' && <SortIcon col={col} active={active} dir={sortDir} />}
      </span>
    </th>
  )
}

// ---- Linha de KPI resumo ----
function SummaryBar({ items }: { items: PortfolioItem[] }) {
  const totalMarketValue  = items.reduce((s, i) => s + i.marketValue, 0)
  const totalInvested     = items.reduce((s, i) => s + i.investedAmount, 0)
  const totalPnL          = items.reduce((s, i) => s + i.unrealizedPnL, 0)
  const totalPnLPct       = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0
  const positive          = totalPnL >= 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {([
        { label: 'Valor de Mercado', value: fmt.currency(totalMarketValue) },
        { label: 'Capital Investido', value: fmt.currency(totalInvested) },
        {
          label: 'Resultado Não-Realizado',
          value: fmt.currency(totalPnL),
          color: positive ? 'text-emerald-400' : 'text-rose-400',
        },
        {
          label: 'Rentabilidade',
          value: `${positive ? '+' : ''}${fmt.percent(totalPnLPct)}`,
          color: positive ? 'text-emerald-400' : 'text-rose-400',
        },
      ] as const).map((kpi) => (
        <div
          key={kpi.label}
          className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3"
        >
          <p className="text-xs text-[var(--color-text-muted)] mb-1">{kpi.label}</p>
          <p className={`text-base font-semibold tabular-nums ${'color' in kpi ? kpi.color : ''}`}>
            {kpi.value}
          </p>
        </div>
      ))}
    </div>
  )
}

export default function PortfolioPage() {
  const { data, isLoading, isError, refetch } = usePortfolioItems()

  const [search,  setSearch]  = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('marketValue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(col: SortKey) {
    if (col === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(col)
      setSortDir('desc')
    }
  }

  const filtered = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    const base = q
      ? data.filter(
          (i) =>
            i.asset.ticker.toLowerCase().includes(q) ||
            i.asset.name.toLowerCase().includes(q),
        )
      : data

    return [...base].sort((a, b) => {
      let av: number | string = 0
      let bv: number | string = 0
      if (sortKey === 'ticker') {
        av = a.asset.ticker
        bv = b.asset.ticker
        return sortDir === 'asc'
          ? (av as string).localeCompare(bv as string)
          : (bv as string).localeCompare(av as string)
      }
      av = a[sortKey] as number
      bv = b[sortKey] as number
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [data, search, sortKey, sortDir])

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-xs mb-1">
          <Briefcase size={13} />
          <span>Portfólio</span>
        </div>
        <h1 className="text-xl font-semibold">Posições</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          Todas as posições consolidadas da carteira
        </p>
      </div>

      {/* KPI Bar — só mostra quando há dados */}
      {!isLoading && !isError && data && data.length > 0 && (
        <SummaryBar items={data} />
      )}

      {/* Barra de busca */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
          <input
            type="text"
            placeholder="Buscar por ticker ou nome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg placeholder:text-[var(--color-text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
          />
        </div>
        {data && (
          <span className="text-xs text-[var(--color-text-faint)]">
            {filtered.length} posição{filtered.length !== 1 ? 'ões' : ''}
          </span>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden">

        {/* Skeleton */}
        {isLoading && (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-28" />
              </div>
            ))}
          </div>
        )}

        {/* Erro */}
        {isError && (
          <ErrorState
            message="Não foi possível carregar as posições."
            onRetry={() => refetch()}
          />
        )}

        {/* Tabela real */}
        {!isLoading && !isError && (
          <>
            {filtered.length === 0 ? (
              <EmptyState search={search} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[var(--color-border)]">
                    <tr>
                      <Th label="Ativo"       col="ticker"              sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <Th label="Qtd"         col="quantity"            sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                      <Th label="Preço Médio" col="ticker"              sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                      <Th label="Cotação"     col="marketValue"         sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                      <Th label="Val. Mercado" col="marketValue"        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                      <Th label="Resultado"   col="unrealizedPnL"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                      <Th label="%"           col="unrealizedPnLPercent" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/40">
                    {filtered.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-[var(--color-surface-3)]/50 transition-colors"
                      >
                        {/* Ativo */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-sm">{item.asset.ticker}</span>
                            <span className="text-xs text-[var(--color-text-muted)] truncate max-w-[160px]">
                              {item.asset.name}
                            </span>
                            <ClassBadge
                              code={item.asset.assetClass.code}
                              name={item.asset.assetClass.name}
                            />
                          </div>
                        </td>
                        {/* Quantidade */}
                        <td className="px-4 py-3 text-right tabular-nums text-sm">
                          {item.quantity.toLocaleString('pt-BR')}
                        </td>
                        {/* Preço médio */}
                        <td className="px-4 py-3 text-right tabular-nums text-sm">
                          {fmt.currency(item.averagePrice)}
                        </td>
                        {/* Cotação atual */}
                        <td className="px-4 py-3 text-right tabular-nums text-sm">
                          {fmt.currency(item.marketPrice)}
                        </td>
                        {/* Valor de mercado */}
                        <td className="px-4 py-3 text-right tabular-nums text-sm font-medium">
                          {fmt.currency(item.marketValue)}
                        </td>
                        {/* Resultado R$ */}
                        <td className="px-4 py-3 text-right">
                          <PnLCell value={item.unrealizedPnL} percent={item.unrealizedPnLPercent} />
                        </td>
                        {/* % separado — coluna visual só repete a info, mas ajuda scan */}
                        <td className="px-4 py-3 text-right tabular-nums text-sm">
                          <span className={item.unrealizedPnLPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {item.unrealizedPnLPercent >= 0 ? '+' : ''}{fmt.percent(item.unrealizedPnLPercent)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
