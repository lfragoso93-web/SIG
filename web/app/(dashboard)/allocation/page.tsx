'use client'

import { useMemo, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { PieChart as PieIcon, AlertCircle, RefreshCw, Target } from 'lucide-react'
import { useAllocation } from '@/lib/hooks/useDashboard'
import { fmt } from '@/lib/utils'

const PIE_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#3b82f6',
  '#a855f7', '#ec4899', '#14b8a6', '#f97316',
  '#84cc16', '#06b6d4',
]

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--color-surface-offset)] rounded animate-pulse ${className}`} />
}

function PieTooltip({ active, payload }: {
  active?: boolean
  payload?: { name: string; value: number; payload: { currentPercent: number } }[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 shadow-lg text-xs">
      <p className="font-medium mb-0.5">{d.name}</p>
      <p className="tabular-nums text-[var(--color-text-muted)]">
        {fmt.currency(d.value)} · {fmt.percent(d.payload.currentPercent)}
      </p>
    </div>
  )
}

type SortKey = 'value' | 'name' | 'diff'

export default function AllocationPage() {
  const { data, isLoading, isError, refetch } = useAllocation()
  const [sort, setSort] = useState<SortKey>('value')

  const total = useMemo(
    () => (data ?? []).reduce((s, d) => s + d.currentValue, 0),
    [data],
  )

  const sorted = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => {
      if (sort === 'value') return b.currentValue - a.currentValue
      if (sort === 'name')  return a.assetClassName.localeCompare(b.assetClassName)
      // diff: mais distante da meta primeiro
      const da = Math.abs(a.diff ?? 0)
      const db = Math.abs(b.diff ?? 0)
      return db - da
    })
  }, [data, sort])

  const pieData = useMemo(
    () => sorted.map((d) => ({
      name:           d.assetClassName,
      value:          d.currentValue,
      currentPercent: d.currentPercent,
    })),
    [sorted],
  )

  const hasTarget   = (data ?? []).some((d) => d.targetPercent !== null)
  const numClasses  = sorted.length
  const largestPct  = sorted[0]?.currentPercent ?? 0
  const outOfTarget = hasTarget
    ? (data ?? []).filter((d) => d.diff !== null && Math.abs(d.diff!) > 5).length
    : null

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-xs mb-1">
          <PieIcon size={13} />
          <span>Alocação</span>
        </div>
        <h1 className="text-xl font-semibold">Alocação por Classe</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          Distribuição atual{hasTarget ? ' vs. meta' : ''}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Patrimônio Total', value: isLoading ? null : fmt.currency(total) },
          { label: 'Classes de Ativos', value: isLoading ? null : String(numClasses) },
          { label: 'Maior Concentração', value: isLoading ? null : fmt.percent(largestPct) },
          {
            label: hasTarget ? 'Fora da Meta (&gt;5%)' : 'Meta Definida',
            value: isLoading ? null : outOfTarget !== null ? String(outOfTarget) + ' classe(s)' : 'Não',
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3"
          >
            <p className="text-xs text-[var(--color-text-muted)] mb-1" dangerouslySetInnerHTML={{ __html: label }} />
            {value === null
              ? <Skeleton className="h-5 w-20" />
              : <p className="text-sm font-semibold tabular-nums">{value}</p>
            }
          </div>
        ))}
      </div>

      {/* Gráfico + Tabela */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Pizza */}
        <div className="xl:col-span-2 bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
          <p className="text-sm font-medium mb-4">Distribuição</p>
          {isLoading && <Skeleton className="h-64 w-full" />}
          {isError && (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-center">
              <AlertCircle size={24} className="text-[var(--color-error)]" />
              <p className="text-sm text-[var(--color-text-muted)]">Erro ao carregar.</p>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:opacity-80"
              >
                <RefreshCw size={12} /> Tentar novamente
              </button>
            </div>
          )}
          {!isLoading && !isError && pieData.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={64}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          {!isLoading && !isError && pieData.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-[var(--color-text-faint)] text-sm">
              <PieIcon size={32} />
              <p>Sem dados de alocação</p>
            </div>
          )}
        </div>

        {/* Tabela detalhada */}
        <div className="xl:col-span-3 bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
          {/* Cabeçalho com sort */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border-subtle)]">
            <p className="text-sm font-medium">Detalhe por classe</p>
            <div className="flex gap-1">
              {(['value', 'name', 'diff'] as SortKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setSort(k)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                    sort === k
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)]'
                  }`}
                >
                  {k === 'value' ? 'Valor' : k === 'name' ? 'Nome' : 'Desvio'}
                </button>
              ))}
            </div>
          </div>

          {/* Linhas */}
          {isLoading && (
            <div className="p-4 space-y-3">
              {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          )}

          {!isLoading && !isError && sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-[var(--color-text-faint)] text-sm">
              <Target size={28} />
              <p>Nenhuma classe com alocação</p>
            </div>
          )}

          {!isLoading && !isError && sorted.map((item, i) => {
            const color       = PIE_COLORS[i % PIE_COLORS.length]
            const hasDiff     = item.diff !== null && item.targetPercent !== null
            const diffVal     = item.diff ?? 0
            const diffColor   = Math.abs(diffVal) <= 2
              ? 'text-[var(--color-text-faint)]'
              : diffVal > 0 ? 'text-amber-400' : 'text-blue-400'
            const barWidth    = Math.min(item.currentPercent, 100)
            const targetWidth = item.targetPercent ? Math.min(item.targetPercent, 100) : null

            return (
              <div
                key={item.assetClassCode}
                className="px-5 py-4 border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-surface-offset)] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-sm font-medium truncate">{item.assetClassName}</span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {hasDiff && (
                      <span className={`text-xs tabular-nums font-medium ${diffColor}`}>
                        {diffVal > 0 ? '+' : ''}{fmt.percent(diffVal)}
                      </span>
                    )}
                    <span className="text-xs text-[var(--color-text-muted)] tabular-nums w-16 text-right">
                      {fmt.currency(item.currentValue)}
                    </span>
                    <span className="text-xs font-semibold tabular-nums w-12 text-right">
                      {fmt.percent(item.currentPercent)}
                    </span>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="relative h-1.5 bg-[var(--color-surface-offset)] rounded-full overflow-visible">
                  {/* Barra atual */}
                  <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%`, background: color, opacity: 0.8 }}
                  />
                  {/* Marcador de meta */}
                  {targetWidth !== null && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/60 rounded-full"
                      style={{ left: `${targetWidth}%` }}
                      title={`Meta: ${fmt.percent(item.targetPercent!)}`}
                    />
                  )}
                </div>

                {hasDiff && (
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-[var(--color-text-faint)]">
                      Meta: {fmt.percent(item.targetPercent!)}
                    </span>
                    <span className={`text-[10px] ${diffColor}`}>
                      {Math.abs(diffVal) <= 2
                        ? 'Na meta'
                        : diffVal > 0 ? 'Sobrealocado' : 'Sublocado'
                      }
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
