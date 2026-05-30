'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell,
} from 'recharts'
import { Wallet, TrendingUp, TrendingDown, Minus, AlertCircle, RefreshCw } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { usePerformanceTimeline, usePerformanceByClass, today, daysAgo } from '@/lib/hooks/usePerformancePage'
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
    <div className="flex items-center gap-3 bg-[var(--color-error-muted)] border border-[var(--color-error)]/30 text-[var(--color-error)] rounded-xl px-4 py-3 text-sm">
      <AlertCircle size={15} className="flex-shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onRetry} className="flex items-center gap-1 text-xs underline hover:no-underline">
        <RefreshCw size={11} /> Tentar novamente
      </button>
    </div>
  )
}

function AreaTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 shadow-lg text-xs space-y-1">
      <p className="text-[var(--color-text-muted)] mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-6">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="tabular-nums font-semibold">{fmt.currency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className="tabular-nums font-semibold">{fmt.currency(payload[0].value)}</p>
    </div>
  )
}

export default function PatrimonyPage() {
  const [preset, setPreset] = useState<number>(90)

  const endDate   = today()
  const startDate = preset >= 9999 ? '2020-01-01' : daysAgo(preset)

  const timeline  = usePerformanceTimeline(startDate, endDate, 'DAILY')
  const byClass   = usePerformanceByClass(endDate, 'DAILY')

  const chartData = useMemo(() => {
    if (!timeline.data?.points) return []
    return timeline.data.points.map((p) => ({
      date:        format(parseISO(p.referenceDate), 'dd/MM', { locale: ptBR }),
      Investido:   p.totalInvested,
      Mercado:     p.totalMarketValue,
      'P&L':       p.totalProfitLoss,
    }))
  }, [timeline.data])

  const lastPoint = timeline.data?.points.at(-1)
  const pnl       = lastPoint?.totalProfitLoss ?? 0
  const pnlPct    = lastPoint?.totalProfitLossPct ?? null
  const PnLIcon   = pnl > 0 ? TrendingUp : pnl < 0 ? TrendingDown : Minus
  const pnlColor  = pnl > 0 ? 'var(--color-success)' : pnl < 0 ? 'var(--color-error)' : 'var(--color-text-muted)'

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-xs mb-1">
          <Wallet size={13} />
          <span>Patrimônio</span>
        </div>
        <h1 className="text-xl font-semibold">Evolução do Patrimônio</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          Histórico de valor de mercado, capital investido e resultado
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
          <p className="text-xs text-[var(--color-text-muted)] mb-3">Valor de Mercado Atual</p>
          {timeline.isLoading ? <Skeleton className="h-7 w-40" /> : (
            <p className="text-2xl font-bold tabular-nums">
              {fmt.currency(lastPoint?.totalMarketValue ?? 0)}
            </p>
          )}
        </div>
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
          <p className="text-xs text-[var(--color-text-muted)] mb-3">Capital Investido</p>
          {timeline.isLoading ? <Skeleton className="h-7 w-36" /> : (
            <p className="text-2xl font-bold tabular-nums">
              {fmt.currency(lastPoint?.totalInvested ?? 0)}
            </p>
          )}
        </div>
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[var(--color-text-muted)]">Resultado (P&amp;L)</p>
            <PnLIcon size={14} style={{ color: pnlColor }} />
          </div>
          {timeline.isLoading ? <Skeleton className="h-7 w-32" /> : (
            <div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: pnlColor }}>
                {pnl >= 0 ? '+' : ''}{fmt.currency(pnl)}
              </p>
              {pnlPct !== null && (
                <p className="text-xs mt-0.5" style={{ color: pnlColor }}>
                  {pnlPct >= 0 ? '+' : ''}{fmt.percent(pnlPct * 100)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Gráfico evolução */}
      <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-medium">Evolução Histórica</p>
          <div className="flex gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setPreset(p.days)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  preset === p.days
                    ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary-text)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {timeline.isError && (
          <ErrorBanner
            message="Não foi possível carregar a timeline. Gere snapshots para o período selecionado."
            onRetry={() => timeline.refetch()}
          />
        )}

        {timeline.isLoading && <Skeleton className="h-56 w-full" />}

        {!timeline.isLoading && !timeline.isError && chartData.length === 0 && (
          <div className="h-56 flex flex-col items-center justify-center gap-2 text-[var(--color-text-faint)]">
            <Wallet size={28} />
            <p className="text-sm">Nenhum dado para o período selecionado.</p>
          </div>
        )}

        {!timeline.isLoading && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={224}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradMercado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradInvestido" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--color-text-faint)' }}
                axisLine={false} tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => fmt.currency(v).replace('R$\u00a0', 'R$ ')}
                tick={{ fontSize: 10, fill: 'var(--color-text-faint)' }}
                axisLine={false} tickLine={false}
                width={84}
              />
              <Tooltip content={<AreaTooltip />} />
              <Legend
                iconType="circle" iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 12, color: 'var(--color-text-muted)' }}
              />
              <Area type="monotone" dataKey="Mercado"   stroke="#6366f1" strokeWidth={2} fill="url(#gradMercado)"   dot={false} activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="Investido" stroke="#22c55e" strokeWidth={1.5} fill="url(#gradInvestido)" dot={false} activeDot={{ r: 4 }} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Breakdown por classe */}
      <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
        <p className="text-sm font-medium mb-5">Patrimônio por Classe de Ativo</p>

        {byClass.isLoading && <Skeleton className="h-40 w-full" />}

        {byClass.isError && (
          <ErrorBanner
            message="Não foi possível carregar os dados por classe."
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
                <Bar dataKey="marketValue" radius={[0, 4, 4, 0]}>
                  {byClass.data.classes.map((_, i) => (
                    <Cell key={i} fill={CLASS_COLORS[i % CLASS_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)]">
                    {['Classe', 'Investido', 'Mercado', 'P&L', '% Atual', '% Meta'].map((h) => (
                      <th key={h} className="px-3 py-2 text-[var(--color-text-muted)] font-medium text-right first:text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byClass.data.classes.map((c, i) => {
                    const gain = c.profitLoss > 0
                    return (
                      <tr key={c.code} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-3)] transition-colors">
                        <td className="px-3 py-2.5 font-medium flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ background: CLASS_COLORS[i % CLASS_COLORS.length] }} />
                          {c.name}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{fmt.currency(c.investedAmount)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium">{fmt.currency(c.marketValue)}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums ${gain ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                          {gain ? '+' : ''}{fmt.currency(c.profitLoss)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {c.currentPercentage !== null ? fmt.percent(c.currentPercentage * 100) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">
                          {c.targetPercentage !== null ? fmt.percent(c.targetPercentage * 100) : '—'}
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
