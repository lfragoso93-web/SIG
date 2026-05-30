'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  LayoutDashboard, TrendingUp, Wallet, HandCoins, BarChart3,
  AlertCircle, RefreshCw, CalendarRange, X, Loader2, CheckCircle2,
} from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { KpiCard } from '@/components/ui/kpi-card'
import {
  useSnapshots, useAllocation, usePerformance, useDividends,
  useGenerateSnapshotRange,
} from '@/lib/hooks/useDashboard'
import { fmt } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

const ALLOCATION_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#3b82f6',
  '#a855f7', '#ec4899', '#14b8a6', '#f97316',
]

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--color-surface-3)] rounded animate-pulse ${className}`} />
}

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

function AreaTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className="font-semibold tabular-nums">{fmt.currency(payload[0].value)}</p>
    </div>
  )
}

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

// ── Modal Gerar Snapshots ──────────────────────────────────────────────────
function GenerateSnapshotsModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const today = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate]     = useState(today)
  const [result, setResult]       = useState<{ generated: number; skipped: number; errors: number } | null>(null)

  const mutation = useGenerateSnapshotRange()

  const handleGenerate = async () => {
    setResult(null)
    try {
      const data = await mutation.mutateAsync({ startDate, endDate, period: 'DAILY' })
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['snapshots'] })
    } catch {
      // erro tratado via mutation.isError
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl w-full max-w-sm p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CalendarRange size={16} className="text-[var(--color-primary)]" />
            <h2 className="text-sm font-semibold">Gerar Snapshots</h2>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-[var(--color-text-muted)] mb-5">
          Gera snapshots diários do patrimônio para o período selecionado.
          Dias sem preço (feriados/fins de semana) são ignorados automaticamente.
        </p>

        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">Data inicial</label>
            <input
              type="date"
              value={startDate}
              max={today}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">Data final</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={today}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
        </div>

        {mutation.isError && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-error)] bg-[var(--color-error-muted)] rounded-lg px-3 py-2 mb-4">
            <AlertCircle size={13} />
            Erro ao gerar snapshots. Verifique as datas e tente novamente.
          </div>
        )}

        {result && (
          <div className="flex items-start gap-2 text-xs text-[var(--color-success)] bg-[var(--color-success-muted)] rounded-lg px-3 py-2 mb-4">
            <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" />
            <span>
              <strong>{result.generated}</strong> gerado(s)&nbsp;·&nbsp;
              <strong>{result.skipped}</strong> ignorado(s)&nbsp;·&nbsp;
              <strong>{result.errors}</strong> erro(s)
            </span>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={mutation.isPending || !startDate || !endDate}
          className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
        >
          {mutation.isPending ? (
            <><Loader2 size={14} className="animate-spin" /> Gerando...</>
          ) : (
            <><CalendarRange size={14} /> Gerar Snapshots</>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Dashboard Page ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const snapshots  = useSnapshots(90)
  const allocation = useAllocation()
  const perf       = usePerformance()
  const dividends  = useDividends()
  const [showGenModal, setShowGenModal] = useState(false)

  const chartData = useMemo(() => {
    if (!snapshots.data) return []
    return snapshots.data
      .filter((s) => {
        if (!s.snapshotDate) return false
        const d = parseISO(s.snapshotDate)
        return isValid(d)
      })
      .map((s) => ({
        date:  format(parseISO(s.snapshotDate), 'dd/MM', { locale: ptBR }),
        value: s.totalValue,
      }))
  }, [snapshots.data])

  const lastSnapshot = snapshots.data?.at(-1)
  const prevSnapshot = snapshots.data?.at(-2)
  const patrimonioDelta =
    lastSnapshot && prevSnapshot
      ? lastSnapshot.totalValue - prevSnapshot.totalValue
      : undefined

  const totalDividends = dividends.data?.totalYear ?? null

  return (
    <div className="p-6 lg:p-8">
      {showGenModal && <GenerateSnapshotsModal onClose={() => setShowGenModal(false)} />}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-xs mb-1">
              <LayoutDashboard size={13} />
              <span>Dashboard</span>
            </div>
            <h1 className="text-xl font-semibold">Visão Geral</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Resumo atualizado da sua carteira
            </p>
          </div>
          <button
            onClick={() => setShowGenModal(true)}
            className="hidden sm:flex items-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 transition-colors"
          >
            <CalendarRange size={13} />
            Gerar Snapshots
          </button>
        </div>
      </div>

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
          label="Proventos no Ano"
          value={totalDividends}
          format="currency"
          icon={HandCoins}
          loading={dividends.isLoading}
          subtitle={dividends.data ? `Média: ${fmt.currency(dividends.data.avgPerMonth)}/mês` : undefined}
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

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
            <div className="h-52 flex flex-col items-center justify-center gap-3 text-[var(--color-text-faint)]">
              <BarChart3 size={28} />
              <p className="text-sm">Nenhum snapshot encontrado.</p>
              <button
                onClick={() => setShowGenModal(true)}
                className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
              >
                <CalendarRange size={12} />
                Gerar snapshots agora
              </button>
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
