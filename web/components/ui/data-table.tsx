'use client'

import { cn } from '@/lib/utils'

type Column<T> = {
  key:       string
  header:    string
  cell:      (row: T) => React.ReactNode
  align?:    'left' | 'right' | 'center'
  className?: string
}

type Props<T> = {
  columns:   Column<T>[]
  data:      T[]
  loading?:  boolean
  emptyText?: string
  rowKey:    (row: T) => string
}

export function DataTable<T>({
  columns, data, loading, emptyText = 'Nenhum dado encontrado', rowKey,
}: Props<T>) {
  if (loading) {
    return (
      <div className="w-full overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)]">
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)]">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[var(--color-border-subtle)]">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 bg-[var(--color-surface-3)] rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-faint)]">
        <p className="text-sm">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border-subtle)]">
            {columns.map(col => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] whitespace-nowrap',
                  col.align === 'right'  && 'text-right',
                  col.align === 'center' && 'text-center',
                  !col.align             && 'text-left',
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr
              key={rowKey(row)}
              className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-3)] transition-colors"
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={cn(
                    'px-4 py-3 whitespace-nowrap tabular-nums',
                    col.align === 'right'  && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.className,
                  )}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
