import { Building2 } from 'lucide-react'

export default function TreasuryPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-sm mb-1">
          <Building2 size={14} />
          <span>Tesouro Direto</span>
        </div>
        <h1 className="text-xl font-semibold">Tesouro Direto</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Títulos, P&L líquido e IR estimado</p>
      </div>
      <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-8 flex items-center justify-center text-[var(--color-text-faint)] text-sm">
        Em construção — próxima sprint
      </div>
    </div>
  )
}
