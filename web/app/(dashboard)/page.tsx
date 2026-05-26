import { LayoutDashboard } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-sm mb-1">
          <LayoutDashboard size={14} />
          <span>Dashboard</span>
        </div>
        <h1 className="text-xl font-semibold">Visão Geral</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Bem-vindo ao SIG. Selecione um módulo na barra lateral.</p>
      </div>

      {/* Placeholder cards — serão substituídos pelos KPIs reais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {['Patrimônio Total', 'Rentabilidade', 'Proventos Recebidos', 'Rendimento Líquido'].map(label => (
          <div
            key={label}
            className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5"
          >
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-3">{label}</p>
            <div className="h-5 w-28 bg-[var(--color-surface-3)] rounded animate-pulse" />
            <div className="h-3 w-16 bg-[var(--color-surface-3)] rounded animate-pulse mt-2" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Gráfico de patrimônio */}
        <div className="xl:col-span-2 bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
          <p className="text-sm font-medium mb-4">Evolução do Patrimônio</p>
          <div className="h-52 flex items-center justify-center text-[var(--color-text-faint)] text-sm">
            Gráfico disponível após importar snapshots
          </div>
        </div>
        {/* Alocação */}
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-5">
          <p className="text-sm font-medium mb-4">Alocação por Classe</p>
          <div className="h-52 flex items-center justify-center text-[var(--color-text-faint)] text-sm">
            Gráfico disponível após cadastrar ativos
          </div>
        </div>
      </div>
    </div>
  )
}
