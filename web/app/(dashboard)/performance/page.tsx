'use client'

import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, BarChart, Bar, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus, BarChart3,
  AlertCircle, RefreshCw, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { format, parseISO, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  usePerformanceSummary,
  usePerformanceTimeline,
  usePerformanceByClass,
  today,
  daysAgo,
} from '@/lib/hooks/usePerformancePage'
import { fmt } from '@/lib/utils'

const CLASS_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#3b82f6',
  '#a855f7', '#ec4899', '#14b8a6', '#f97316',
]

const PRESETS = [
  { label: '1M',  days: 30  },
  { label: '3M',  days: 90  },
  { label: '6M',  days: 180 },
  { label: '1A',  days: 365 },
  { label: 'MAX', days: 9999 },
] as const

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--color-surface-3)] rounded animate-pulse ${className}`} />
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-[var(--color-error-muted)] border border-[var(--color-error)]/30 text-[var(--color-error)] rounded-xl px-4 py-3 text-sm mb-6">
      <AlertCircle size={15} className="flex-shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onRetry} className="flex items-center gap-1 text-xs underline hover:no-underline">
        <RefreshCw size={11} /> Tentar novamente
      </button>
    </div>
  )
}

function LineTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  const positive = v >= 0
  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className={`font-bold tabular-nums ${positive ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
        {positive ? '+' : ''}{v.toFixed(2)}%
      </p>
    </div>
  )
}

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  const pos = v >= 0
  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className={`font-semibold tabular-nums ${pos ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
        {pos ? '+' : ''}{fmt.currency(v)}
      </p>
    </div>
  )
}

export default function PerformancePage() {
  const [preset, setPreset] = useState<number>(90)

  const endDate   = today()
  const startDate = preset >= 9999 ? '2020-01-01' : daysAgo(preset)

  const summary  = usePerformanceSummary(startDate, endDate, 'DAILY')
  const timeline = usePerformanceTimeline(startDate, endDate, 'DAILY')
  const byClass  = usePerformanceByClass(endDate, 'DAILY')

  // Linha de rentabilidade % ao longo do tempo
  const pctData = useMemo(() => {
    if (!timeline.data?.points) return []
    return timeline.data.points
      .filter((p) => p.totalProfitLossPct !== null)
      .map((p) => ({
        date: format(parseISO(p.referenceDate), 'dd/MM', { locale: ptBR }),
        pct:  Number(((p.totalProfitLossPct ?? 0) * 100).toFixed(2)),
      }))
  }, [timeline.data])

  const s = summary.data
  const ret = s?.returnPercentage ?? null
  const RetIcon = ret === null ? Minus : ret > 0 ? TrendingUp : TrendingDown
  const retColor = ret === null ? 'var(--color-text-muted)' : ret > 0 ? 'var(--color-success)' : 'var(--color-error)'

  return (
    <div className="p-6 lg:p-8">
      {/* Header + seletor de período */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-xs mb-1">
            <TrendingUp size={13} />
            <span>Rentabilidade</span>
          </div>
          <h1 className="text-xl font-semibold">Rentabilidade da Carteira</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Retorno, ganho de capital e performance por classe
          </p>
        </div>
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPreset(p.days)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                preset === p.days
                  ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary-text)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {summary.isError && (
        <ErrorBanner
          message="Não foram encontrados snapshots para o período. Gere snapshots para visualizar a rentabilidade."
          onRetry={() => summary.refetch()}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {/* Retorno % */}
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[var(--color-text-muted)]">Retorno no Período</p>
            <RetIcon size={14} style={{ color: retColor }} />
          </div>
          {summary.isLoading ? <Skeleton className="h-7 w-24" /> : (
            <p className="text-2xl font-bold tabular-nums" style={{ color: retColor }}>
              {ret !== null ? `${ret >= 0 ? '+' : ''}${(ret * 100).toFixed(2)}%` : '—'}
            </p>
          )}
        </div>

        {/* Ganho de capital */}
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[var(--color-text-muted)]">Ganho de Capital</p>
            {s && (s.capitalGain >= 0
              ? <ArrowUpRight size={14} className="text-[var(--color-success)]" />
              : <ArrowDownRight size={14} className="text-[var(--color-error)]" />)}
          </div>
          {summary.isLoading ? <Skeleton className="h-7 w-28" /> : (
            <p className={`text-2xl font-bold tabular-nums ${
              (s?.capitalGain ?? 0) >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
            }`}>
              {s ? `${s.capitalGain >= 0 ? '+' : ''}${fmt.currency(s.capitalGain)}` : '—'}
            </p>
          )}
        </div>

        {/* Variação absoluta */}
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
          <p className="text-xs text-[var(--color-text-muted)] mb-3">Variação Absoluta</p>
          {summary.isLoading ? <Skeleton className="h-7 w-28" /> : (
            <p className="text-2xl font-bold tabular-nums">
              {s ? fmt.currency(s.absoluteChange) : '—'}
            </p>
          )}
          {s && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{fmt.currency(s.initialMarketValue)} → {fmt.currency(s.finalMarketValue)}</p>}
        </div>

        {/* Aportes líquidos */}
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
          <p className="text-xs text-[var(--color-text-muted)] mb-3">Aportes Líquidos</p>
          {summary.isLoading ? <Skeleton className="h-7 w-28" /> : (
            <p className="text-2xl font-bold tabular-nums">
              {s ? fmt.currency(s.netContributions) : '—'}
            </p>
          )}
          {s && (
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {s.startReferenceDate} — {s.endReferenceDate}
            </p>
          )}
        </div>
      </div>

      {/* Gráfico de rentabilidade % */}
      <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5 mb-6">
        <p className="text-sm font-medium mb-5">
          Rentabilidade Acumulada (%)
          <span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">{startDate} — {endDate}</span>
        </p>

        {timeline.isLoading && <Skeleton className="h-52 w-full" />}

        {!timeline.isLoading && !timeline.isError && pctData.length === 0 && (
          <div className="h-52 flex flex-col items-center justify-center gap-2 text-[var(--color-text-faint)]">
            <BarChart3 size={28} />
            <p className="text-sm">Nenhum dado para o período.</p>
          </div>
        )}

        {!timeline.isLoading && pctData.length > 0 && (() => {
          const hasNeg = pctData.some((d) => d.pct < 0)
          return (
            <ResponsiveContainer width="100%" height={208}>
              <LineChart data={pctData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--color-text-faint)' }}
                  axisLine={false} tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                  tick={{ fontSize: 10, fill: 'var(--color-text-faint)' }}
                  axisLine={false} tickLine={false}
                  width={52}
                />
                <Tooltip content={<LineTooltip />} />
                {hasNeg && (
                  <ReferenceLine y={0} stroke="var(--color-border)" strokeDasharray="3 3" />
                )}
                <Line
                  type="monotone"
                  dataKey="pct"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#6366f1', stroke: 'var(--color-surface-2)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )
        })()}
      </div>

      {/* P&L por classe */}
      <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
        <p className="text-sm font-medium mb-5">P&amp;L por Classe de Ativo</p>

        {byClass.isLoading && <Skeleton className="h-40 w-full" />}

        {byClass.isError && (
          <ErrorBanner
            message="Não foi possível carregar a performance por classe."
            onRetry={() => byClass.refetch()}
          />
        )}

        {!byClass.isLoading && !byClass.isError && byClass.data && (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={byClass.data.classes}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
                barSize={16}
              >
                <XAxis
                  type="number"
                  tickFormatter={(v) => fmt.currency(v).replace('R$\u00a0', 'R$ ')}
                  tick={{ fontSize: 10, fill: 'var(--color-text-faint)' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  type="category" dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  axisLine={false} tickLine={false}
                  width={96}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--color-surface-3)' }} />
                <ReferenceLine x={0} stroke="var(--color-border)" />
                <Bar dataKey="profitLoss" radius={[0, 4, 4, 0]}>
                  {byClass.data.classes.map((c, i) => (
                    <Cell
                      key={i}
                      fill={c.profitLoss >= 0 ? CLASS_COLORS[i % CLASS_COLORS.length] : 'var(--color-error)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)]">
                    {['Classe', 'Investido', 'Mercado', 'P&L', 'Retorno', 'Rebalancear'].map((h) => (
                      <th key={h} className="px-3 py-2 text-[var(--color-text-muted)] font-medium text-right first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byClass.data.classes.map((c, i) => {
                    const pnlPct = c.investedAmount > 0
                      ? ((c.profitLoss / c.investedAmount) * 100)
                      : null
                    const pos = c.profitLoss >= 0
                    const reb = c.rebalanceDifference
                    return (
                      <tr key={c.code} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-3)] transition-colors">
                        <td className="px-3 py-2.5 font-medium">
                          <span className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full" style={{ background: CLASS_COLORS[i % CLASS_COLORS.length] }} />
                            {c.name}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{fmt.currency(c.investedAmount)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmt.currency(c.marketValue)}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums ${pos ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                          {pos ? '+' : ''}{fmt.currency(c.profitLoss)}
                        </td>
                        <td className={`px-3 py-2.5 text-right tabular-nums ${pos ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                          {pnlPct !== null ? `${pos ? '+' : ''}${pnlPct.toFixed(2)}%` : '—'}
                        </td>
                        <td className={`px-3 py-2.5 text-right tabular-nums ${
                          reb === null ? 'text-[var(--color-text-muted)]'
                          : reb > 0 ? 'text-[var(--color-success)]'
                          : reb < 0 ? 'text-[var(--color-error)]'
                          : 'text-[var(--color-text-muted)]'
                        }`}>
                          {reb !== null ? `${reb > 0 ? '+' : ''}${fmt.currency(reb)}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
