'use client'

import { useState } from 'react'
import {
  FileText, TrendingUp, TrendingDown, AlertCircle,
  RefreshCw, ChevronDown, ChevronUp, Info,
} from 'lucide-react'
import { useIrpf } from '@/lib/hooks/useIrpf'
import { fmt } from '@/lib/utils'
import type { MonthlyCapitalGain, IncomeRow, PositionRow, DarfRow } from '@/lib/types/irpf'

const MONTHS_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

function monthLabel(yyyymm: string) {
  const [, m] = yyyymm.split('-')
  return MONTHS_PT[Number(m) - 1] ?? yyyymm
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--color-surface-3)] rounded animate-pulse ${className}`} />
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertCircle size={28} className="text-[var(--color-error)]" />
      <p className="text-sm text-[var(--color-text-muted)]">Não foi possível carregar os dados de IRPF.</p>
      <button onClick={onRetry} className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:opacity-80">
        <RefreshCw size={12} /> Tentar novamente
      </button>
    </div>
  )
}

function KpiCard({
  label, value, sub, positive,
}: {
  label: string
  value: string
  sub?: string
  positive?: boolean
}) {
  const color =
    positive === undefined ? '' :
    positive ? 'text-emerald-400' : 'text-rose-400'
  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl px-5 py-4">
      <p className="text-xs text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-faint)] mt-0.5">{sub}</p>}
    </div>
  )
}

function Section({
  title, badge, children, defaultOpen = true,
}: {
  title: string
  badge?: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--color-surface-offset)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{title}</span>
          {badge && (
            <span className="text-[10px] font-semibold bg-[var(--color-surface-3)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={15} className="text-[var(--color-text-faint)]" /> : <ChevronDown size={15} className="text-[var(--color-text-faint)]" />}
      </button>
      {open && <div className="border-t border-[var(--color-border-subtle)]">{children}</div>}
    </div>
  )
}

// ── Tabela de Ganho de Capital ─────────────────────────────────────────────
function CapitalGainsTable({ rows }: { rows: MonthlyCapitalGain[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--color-text-faint)] text-center py-8">Nenhuma venda no período.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--color-border-subtle)]">
            {['Mês', 'Classe', 'Operação', 'Receita Venda', 'Custo', 'Lucro/Prejuízo', 'Compensado', 'Base Cálculo', 'Alíquota', 'IR Devido'].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left font-medium text-[var(--color-text-muted)] whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-subtle)]">
          {rows.map((row, i) => {
            const profitPos = row.profit >= 0
            return (
              <tr key={i} className="hover:bg-[var(--color-surface-offset)] transition-colors">
                <td className="px-4 py-3 font-medium">{monthLabel(row.month)}/{row.month.slice(0, 4)}</td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{row.className}</td>
                <td className="px-4 py-3">
                  {row.hasDayTrade
                    ? <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">Day Trade</span>
                    : <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">Swing</span>}
                </td>
                <td className="px-4 py-3 tabular-nums">{fmt.currency(row.grossSales)}</td>
                <td className="px-4 py-3 tabular-nums text-[var(--color-text-muted)]">{fmt.currency(row.costBasis)}</td>
                <td className={`px-4 py-3 tabular-nums font-medium ${profitPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <span className="inline-flex items-center gap-1">
                    {profitPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {profitPos ? '+' : ''}{fmt.currency(row.profit)}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-[var(--color-text-muted)]">
                  {row.lossCarryIn > 0 ? `-${fmt.currency(row.lossCarryIn)}` : '—'}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {row.isExempt
                    ? <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-semibold">Isento</span>
                    : fmt.currency(row.taxableBase)}
                </td>
                <td className="px-4 py-3 tabular-nums text-[var(--color-text-muted)]">
                  {row.isExempt ? '—' : `${(row.irDue > 0 && row.taxableBase > 0 ? (row.irDue / row.taxableBase) * 100 : 0).toFixed(0)}%`}
                </td>
                <td className={`px-4 py-3 tabular-nums font-semibold ${row.irDue > 0 ? 'text-rose-400' : 'text-[var(--color-text-muted)]'}`}>
                  {row.irDue > 0 ? fmt.currency(row.irDue) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Tabela de Rendimentos ──────────────────────────────────────────────────
function IncomeTable({ rows }: { rows: IncomeRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--color-text-faint)] text-center py-8">Nenhum rendimento no período.</p>
  }
  const TYPE_LABEL: Record<string, string> = {
    DIVIDEND: 'Dividendo', JCP: 'JCP', FII_INCOME: 'Rendimento FII',
    COUPON: 'Cupom', AMORTIZATION: 'Amortização', SUBSCRIPTION_RIGHT: 'Direito de Subscrição',
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--color-border-subtle)]">
            {['Ativo', 'Classe', 'Tipo', 'Bruto', 'IR Retido', 'Líquido', 'Status'].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left font-medium text-[var(--color-text-muted)] whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-subtle)]">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--color-surface-offset)] transition-colors">
              <td className="px-4 py-3">
                <p className="font-semibold">{row.ticker}</p>
                <p className="text-[var(--color-text-faint)] truncate max-w-[160px]">{row.assetName}</p>
              </td>
              <td className="px-4 py-3 text-[var(--color-text-muted)]">{row.className}</td>
              <td className="px-4 py-3">{TYPE_LABEL[row.type] ?? row.type}</td>
              <td className="px-4 py-3 tabular-nums">{fmt.currency(row.totalGross)}</td>
              <td className="px-4 py-3 tabular-nums text-rose-400">
                {row.irWithheld > 0 ? fmt.currency(row.irWithheld) : '—'}
              </td>
              <td className="px-4 py-3 tabular-nums font-medium text-emerald-400">{fmt.currency(row.netAmount)}</td>
              <td className="px-4 py-3">
                {row.isExempt
                  ? <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">Isento</span>
                  : <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">Tributável</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Tabela de Bens e Direitos ──────────────────────────────────────────────
function PositionsTable({ rows }: { rows: PositionRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--color-text-faint)] text-center py-8">Nenhuma posição encontrada.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--color-border-subtle)]">
            {['Ativo', 'Classe', 'Qtd.', 'Custo Médio', 'Custo Total (declarar)', 'Val. Mercado'].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left font-medium text-[var(--color-text-muted)] whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-subtle)]">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--color-surface-offset)] transition-colors">
              <td className="px-4 py-3">
                <p className="font-semibold">{row.ticker}</p>
                <p className="text-[var(--color-text-faint)] truncate max-w-[180px]">{row.assetName}</p>
              </td>
              <td className="px-4 py-3 text-[var(--color-text-muted)]">{row.className}</td>
              <td className="px-4 py-3 tabular-nums">{row.quantity.toLocaleString('pt-BR')}</td>
              <td className="px-4 py-3 tabular-nums">{fmt.currency(row.averageCost)}</td>
              <td className="px-4 py-3 tabular-nums font-semibold">{fmt.currency(row.totalCost)}</td>
              <td className="px-4 py-3 tabular-nums text-[var(--color-text-muted)]">{fmt.currency(row.marketValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Tabela de DARFs ────────────────────────────────────────────────────────
function DarfTable({ rows }: { rows: DarfRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--color-text-faint)] text-center py-8">Nenhuma DARF a recolher no período.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--color-border-subtle)]">
            {['Competência', 'Grupo', 'Base de Cálculo', 'Alíquota', 'IR Devido', 'Vencimento'].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left font-medium text-[var(--color-text-muted)] whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border-subtle)]">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--color-surface-offset)] transition-colors">
              <td className="px-4 py-3 font-medium">{monthLabel(row.month)}/{row.month.slice(0, 4)}</td>
              <td className="px-4 py-3">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  row.classGroup === 'Day Trade' ? 'bg-amber-500/10 text-amber-400' :
                  row.classGroup === 'FIIs'      ? 'bg-emerald-500/10 text-emerald-400' :
                  'bg-indigo-500/10 text-indigo-400'
                }`}>{row.classGroup}</span>
              </td>
              <td className="px-4 py-3 tabular-nums">{fmt.currency(row.taxableBase)}</td>
              <td className="px-4 py-3 tabular-nums">{(row.rate * 100).toFixed(0)}%</td>
              <td className="px-4 py-3 tabular-nums font-semibold text-rose-400">{fmt.currency(row.irDue)}</td>
              <td className="px-4 py-3 tabular-nums text-[var(--color-text-muted)]">
                {new Date(row.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────
export default function IrpfPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear - 1) // padrão: ano fiscal anterior
  const { data, isLoading, isError, refetch } = useIrpf(year)

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i)

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-xs mb-1">
              <FileText size={13} />
              <span>IRPF</span>
            </div>
            <h1 className="text-xl font-semibold">Imposto de Renda</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Ganho de capital, rendimentos e bens para declaração
            </p>
          </div>

          {/* Seletor de ano */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-muted)]">Ano-calendário</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[1,2,3,4].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && data && (
        <div className="space-y-5">

          {/* Aviso disclaimer */}
          <div className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-300">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              Os valores são calculados com base nas transações registradas. Consulte um contador para a declaração oficial.
              Renda fixa e Tesouro Direto têm IR retido na fonte — não aparecem no ganho de capital.
            </span>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              label="IR Total Devido (Renda Variável)"
              value={fmt.currency(data.totalIrDue)}
              positive={data.totalIrDue === 0}
              sub={data.totalIrDue > 0 ? 'A recolher via DARF' : 'Nenhum imposto a pagar'}
            />
            <KpiCard
              label="IR Retido na Fonte"
              value={fmt.currency(data.totalIrWithheld)}
              sub="JCP e outros retidos"
            />
            <KpiCard
              label="Rendimentos Isentos"
              value={fmt.currency(data.totalExemptIncome)}
              positive={true}
              sub="Dividendos e FII"
            />
            <KpiCard
              label="Saldo de Prejuízo Acumulado"
              value={fmt.currency(Math.abs(data.lossCarryForward))}
              positive={data.lossCarryForward === 0}
              sub={data.lossCarryForward < 0 ? 'A compensar nos próximos meses' : 'Sem prejuízo a compensar'}
            />
          </div>

          {/* Ganho de Capital */}
          <Section
            title="Ganho de Capital — Renda Variável"
            badge={`${data.monthlyGains.length} mês${data.monthlyGains.length !== 1 ? 'es' : ''}`}
          >
            <CapitalGainsTable rows={data.monthlyGains} />
          </Section>

          {/* DARFs */}
          <Section
            title="DARFs a Recolher"
            badge={`${data.darfs.length} DARF${data.darfs.length !== 1 ? 's' : ''}`}
          >
            <DarfTable rows={data.darfs} />
          </Section>

          {/* Rendimentos */}
          <Section
            title="Rendimentos Recebidos"
            badge={`${data.incomeRows.length} ativo${data.incomeRows.length !== 1 ? 's' : ''}`}
          >
            <IncomeTable rows={data.incomeRows} />
          </Section>

          {/* Bens e Direitos */}
          <Section
            title={`Bens e Direitos — Posição em 31/12/${year}`}
            badge={`${data.positions.length} ativo${data.positions.length !== 1 ? 's' : ''}`}
            defaultOpen={false}
          >
            <PositionsTable rows={data.positions} />
          </Section>
        </div>
      )}
    </div>
  )
}
