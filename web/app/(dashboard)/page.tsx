'use client'

import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { LayoutDashboard, TrendingUp, Wallet, HandCoins, BarChart3, AlertCircle, RefreshCw } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { KpiCard } from '@/components/ui/kpi-card'
import { useSnapshots, useAllocation, usePerformance, useDividends } from '@/lib/hooks/useDashboard'
import { fmt } from '@/lib/utils'

// Cores para o gráfico de alocação — sequência pensada para dark mode
const ALLOCATION_COLORS = [
  '#6366f1', // indigo  — primário
  '#22c55e', // green
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
]

// ---- Skeleton genérico ----
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[var(--color-surface-3)] rounded animate-pulse ${className}`} />
  )
}

// ---- Estado de erro reutilizável ----
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
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

// ---- Tooltip customizado do gráfico de área ----
function AreaTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className="font-semibold tabular-nums">{fmt.currency(payload[0].value)}</p>
    </div>
  )
}

// ---- Tooltip customizado do gráfico de pizza ----
function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { currentPercent: number } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-medium mb-0.5">{d.name}</p>
      <p className="tabular-nums text-[var(--color-text-muted)]">
        {fmt.currency(d.value)} &middot; {fmt.percent(d.payload.currentPercent)}
      </p>
    </div>
  )
}

export default function DashboardPage() {
  const snapshots  = useSnapshots(90)
  const allocation = useAllocation()
  const perf       = usePerformance()
  const dividends  = useDividends()

  // Dados formatados para o gráfico de área
  const chartData = useMemo(() => {
    if (!snapshots.data) return []
    return snapshots.data.map((s) => ({
      date:  format(parseISO(s.snapshotDate), 'dd/MM', { locale: ptBR }),
      value: s.totalValue,
    }))
  }, [snapshots.data])

  // Último snapshot para o card de patrimônio
  const lastSnapshot = snapshots.data?.at(-1)
  const prevSnapshot = snapshots.data?.at(-2)
  const patrimonioDelta =
    lastSnapshot && prevSnapshot
      ? lastSnapshot.totalValue - prevSnapshot.totalValue
      : undefined

  // Proventos totais
  const totalDividends = dividends.data?.totalReceived ?? null

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-xs mb-1">
          <LayoutDashboard size={13} />
          <span>Dashboard</span>
        </div>
        <h1 className="text-xl font-semibold">Visão Geral</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          Resumo atualizado da sua carteira
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Patrimônio Total"
          value={lastSnapshot?.totalValue ?? null}
          format="currency"
          delta={patrimonioDelta}
          icon={Wallet}
          loading={snapshots.isLoading}
        />
        <KpiCard
          label="Rentabilidade"
          value={perf.data?.percentReturn ?? null}
          format="percent"
          delta={perf.data?.absoluteReturn}
          icon={TrendingUp}
          loading={perf.isLoading}
          subtitle={perf.data ? `Capital: ${fmt.currency(perf.data.totalInvested)}` : undefined}
        />
        <KpiCard
          label="Proventos Recebidos"
          value={totalDividends}
          format="currency"
          icon={HandCoins}
          loading={dividends.isLoading}
        />
        <KpiCard
          label="Resultado Líquido"
          value={lastSnapshot?.unrealizedPnL ?? null}
          format="currency"
          delta={lastSnapshot?.unrealizedPnL}
          icon={BarChart3}
          loading={snapshots.isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Gráfico de evolução do patrimônio */}
        <div className="xl:col-span-2 bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
          <p className="text-sm font-medium mb-5">
            Evolução do Patrimônio
            <span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">últimos 90 dias</span>
          </p>

          {snapshots.isLoading && <Skeleton className="h-52 w-full" />}

          {snapshots.isError && (
            <ErrorState
              message="Não foi possível carregar os snapshots."
              onRetry={() => snapshots.refetch()}
            />
          )}

          {!snapshots.isLoading && !snapshots.isError && chartData.length === 0 && (
            <div className="h-52 flex flex-col items-center justify-center gap-2 text-[var(--color-text-faint)]">
              <BarChart3 size={28} />
              <p className="text-sm">Nenhum snapshot encontrado.</p>
              <p className="text-xs">
                Gere snapshots via{' '}
                <code className="bg-[var(--color-surface-3)] px-1 rounded">
                  POST /portfolio-snapshots/generate
                </code>
              </p>
            </div>
          )}

          {!snapshots.isLoading && chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={208}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="patrimGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--color-text-faint)' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v) => fmt.currency(v).replace('R$\u00a0', 'R$ ')}
                  tick={{ fontSize: 10, fill: 'var(--color-text-faint)' }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip content={<AreaTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#patrimGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#6366f1', stroke: 'var(--color-surface-2)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gráfico de alocação por classe */}
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
          <p className="text-sm font-medium mb-5">Alocação por Classe</p>

          {allocation.isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-40 w-40 rounded-full mx-auto" />
              <Skeleton className="h-3 w-32 mx-auto" />
              <Skeleton className="h-3 w-24 mx-auto" />
              <Skeleton className="h-3 w-28 mx-auto" />
            </div>
          )}

          {allocation.isError && (
            <ErrorState
              message="Não foi possível carregar a alocação."
              onRetry={() => allocation.refetch()}
            />
          )}

          {!allocation.isLoading && !allocation.isError && (!allocation.data || allocation.data.length === 0) && (
            <div className="h-52 flex flex-col items-center justify-center gap-2 text-[var(--color-text-faint)]">
              <BarChart3 size={28} />
              <p className="text-sm">Nenhum ativo cadastrado.</p>
            </div>
          )}

          {!allocation.isLoading && allocation.data && allocation.data.length > 0 && (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={allocation.data}
                    dataKey="currentValue"
                    nameKey="assetClassName"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {allocation.data.map((_, i) => (
                      <Cell key={i} fill={ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Legenda manual com % */}
              <ul className="mt-3 space-y-1.5">
                {allocation.data.map((item, i) => (
                  <li key={item.assetClassCode} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }}
                      />
                      <span className="text-[var(--color-text-muted)]">{item.assetClassName}</span>
                    </span>
                    <span className="tabular-nums font-medium">
                      {fmt.percent(item.currentPercent)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
