import { cn, fmt } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type Props = {
  label:     string
  value:     number | null
  format?:   'currency' | 'percent' | 'number'
  delta?:    number      // variação vs. período anterior
  icon?:     LucideIcon
  loading?:  boolean
  subtitle?: string
}

export function KpiCard({ label, value, format = 'currency', delta, icon: Icon, loading, subtitle }: Props) {
  const display = value == null
    ? '—'
    : format === 'currency' ? fmt.currency(value)
    : format === 'percent'  ? fmt.percent(value)
    : fmt.number(value)

  const pnl = delta != null ? fmt.pnl(delta) : null

  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-[var(--color-text-muted)]">{label}</p>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-[var(--color-surface-3)] flex items-center justify-center">
            <Icon size={14} className="text-[var(--color-text-muted)]" />
          </div>
        )}
      </div>

      {loading ? (
        <>
          <div className="h-6 w-32 bg-[var(--color-surface-3)] rounded animate-pulse mb-2" />
          <div className="h-3 w-20 bg-[var(--color-surface-3)] rounded animate-pulse" />
        </>
      ) : (
        <>
          <p className={cn('text-xl font-semibold tabular-nums', value == null && 'text-[var(--color-text-faint)]')}>
            {display}
          </p>
          {pnl && (
            <p className={cn('text-xs mt-1 tabular-nums', pnl.className)}>
              {pnl.text}
            </p>
          )}
          {subtitle && !pnl && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1">{subtitle}</p>
          )}
        </>
      )}
    </div>
  )
}
