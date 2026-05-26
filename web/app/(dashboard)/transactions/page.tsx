import { ArrowLeftRight } from 'lucide-react'

export default function TransactionsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-sm mb-1">
          <ArrowLeftRight size={14} />
          <span>Transações</span>
        </div>
        <h1 className="text-xl font-semibold">Histórico de Transações</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Todas as compras, vendas e movimentos</p>
      </div>
      <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-8 flex items-center justify-center text-[var(--color-text-faint)] text-sm">
        Em construção — próxima sprint
      </div>
    </div>
  )
}
