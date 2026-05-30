'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  HandCoins, TrendingUp, Calendar, ChevronDown, ChevronUp,
  AlertCircle, RefreshCw, Coins,
} from 'lucide-react'
import { useDividends } from '@/lib/hooks/useDashboard'
import { fmt } from '@/lib/utils'
import type { DividendByMonth } from '@/lib/api'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--color-surface-3)] rounded animate-pulse ${className}`} />
}

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

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className="font-semibold tabular-nums text-[var(--color-success)]">+{fmt.currency(payload[0].value)}</p>
    </div>
  )
}

// Formata "YYYY-MM" para "Jan", "Fev", etc.
const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
}
function fmtMonth(ym: string): string {
  const [, m] = ym.split('-')
  return MONTH_LABELS[m ?? ''] ?? ym
}

// Linha expandível de mês com eventos detalhados
function MonthRow({ item }: { item: DividendByMonth }) {
  const [expanded, setExpanded] = useState(false)
  const [, m] = item.month.split('-')
  const monthLabel = MONTH_LABELS[m ?? ''] ?? item.month

  return (
    <>
      <tr
        className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-3)] cursor-pointer transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3 text-sm font-medium">{monthLabel}</td>
        <td className="px-4 py-3 text-sm text-right tabular-nums text-[var(--color-success)] font-medium">
          +{fmt.currency(item.total)}
        </td>
        <td className="px-4 py-3 text-sm text-right text-[var(--color-text-muted)] tabular-nums">
          {item.events.length}
        </td>
        <td className="px-4 py-3 text-right">
          {expanded
            ? <ChevronUp size={14} className="ml-auto text-[var(--color-text-muted)]" />
            : <ChevronDown size={14} className="ml-auto text-[var(--color-text-muted)]" />}
        </td>
      </tr>
      {expanded && item.events.map((ev, i) => (
        <tr key={i} className="bg-[var(--color-surface-3)] border-b border-[var(--color-border-subtle)]">
          <td className="pl-8 pr-4 py-2 text-xs text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="font-medium text-[var(--color-text)]">{ev.ticker}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary-muted)] text-[var(--color-primary-text)]">
                {ev.assetClass}
              </span>
            </span>
          </td>
          <td className="px-4 py-2 text-xs text-right tabular-nums text-[var(--color-success)]">
            +{fmt.currency(ev.netAmount)}
          </td>
          <td className="px-4 py-2 text-xs text-right text-[var(--color-text-muted)]">
            {ev.paymentDate}
          </td>
          <td />
        </tr>
      ))}
    </>
  )
}

export default function DividendsPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const { data, isLoading, isError, refetch } = useDividends(year)

  // Dados para o gráfico de barras (últimos 12 meses)
  const chartData = useMemo(() => {
    if (!data?.last12Months) return []
    return data.last12Months.map((m) => ({
      month: fmtMonth(m.month),
      total: m.total,
    }))
  }, [data])

  const maxBar = useMemo(() => Math.max(...chartData.map((d) => d.total), 1), [chartData])

  // Anos disponíveis para seleção (a partir de 2020 ou primeiro ano com dados)
  const firstYear = data?.avgPerYear?.[0]?.year ?? 2020
  const years = Array.from(
    { length: currentYear - firstYear + 1 },
    (_, i) => currentYear - i,
  )

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-xs mb-1">
            <HandCoins size={13} />
            <span>Proventos</span>
          </div>
          <h1 className="text-xl font-semibold">Proventos Recebidos</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Dividendos, JCP e rendimentos recebidos
          </p>
        </div>

        {/* Seletor de ano */}
        <div className="flex items-center gap-1.5">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                year === y
                  ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary-text)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <ErrorState
          message="Não foi possível carregar os proventos."
          onRetry={() => refetch()}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Total no ano */}
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[var(--color-text-muted)]">Total em {year}</p>
            <div className="w-7 h-7 rounded-lg bg-[var(--color-success-muted)] flex items-center justify-center">
              <HandCoins size={14} className="text-[var(--color-success)]" />
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-36" />
          ) : (
            <p className="text-2xl font-bold tabular-nums text-[var(--color-success)]">
              {fmt.currency(data?.totalYear ?? 0)}
            </p>
          )}
        </div>

        {/* Média mensal */}
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[var(--color-text-muted)]">Média Mensal</p>
            <div className="w-7 h-7 rounded-lg bg-[var(--color-primary-muted)] flex items-center justify-center">
              <Calendar size={14} className="text-[var(--color-primary)]" />
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-28" />
          ) : (
            <p className="text-2xl font-bold tabular-nums">
              {fmt.currency(data?.avgPerMonth ?? 0)}
            </p>
          )}
        </div>

        {/* Melhor mês */}
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[var(--color-text-muted)]">Melhor Mês</p>
            <div className="w-7 h-7 rounded-lg bg-[var(--color-warning-muted)] flex items-center justify-center">
              <TrendingUp size={14} className="text-[var(--color-warning)]" />
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-28" />
          ) : (() => {
            const best = data?.byMonth.reduce((a, b) => b.total > a.total ? b : a, data.byMonth[0])
            const [, m] = (best?.month ?? '-').split('-')
            return (
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {fmt.currency(best?.total ?? 0)}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {MONTH_LABELS[m ?? ''] ?? '—'}
                </p>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Gráfico de barras — últimos 12 meses */}
      <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5 mb-6">
        <p className="text-sm font-medium mb-5">
          Histórico Mensal
          <span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">últimos 12 meses</span>
        </p>

        {isLoading && <Skeleton className="h-44 w-full" />}

        {!isLoading && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={176}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={24}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'var(--color-text-faint)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => fmt.currency(v).replace('R$\u00a0', 'R$ ')}
                tick={{ fontSize: 10, fill: 'var(--color-text-faint)' }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--color-surface-3)' }} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.total === maxBar ? '#22c55e' : '#166534'}
                    fillOpacity={entry.total === maxBar ? 1 : 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {!isLoading && chartData.length === 0 && (
          <div className="h-44 flex flex-col items-center justify-center gap-2 text-[var(--color-text-faint)]">
            <Coins size={28} />
            <p className="text-sm">Nenhum provento registrado nos últimos 12 meses.</p>
          </div>
        )}
      </div>

      {/* Tabela por mês com eventos expandíveis */}
      <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border-subtle)]">
          <p className="text-sm font-medium">Detalhamento por Mês — {year}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Clique em um mês para ver os eventos</p>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !data?.byMonth.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-[var(--color-text-faint)]">
            <Coins size={28} />
            <p className="text-sm">Nenhum provento registrado em {year}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)]">Mês</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-muted)]">Total Líquido</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-muted)]">Eventos</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {[...data.byMonth].reverse().map((item) => (
                  <MonthRow key={item.month} item={item} />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-3 text-sm font-semibold">Total {year}</td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums font-bold text-[var(--color-success)]">
                    +{fmt.currency(data.totalYear)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-[var(--color-text-muted)] tabular-nums">
                    {data.byMonth.reduce((s, m) => s + m.events.length, 0)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
