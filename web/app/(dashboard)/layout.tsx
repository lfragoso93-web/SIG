'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  TrendingUp, LayoutDashboard, Briefcase,
  ArrowLeftRight, PieChart, LogOut, Menu, X, Plus,
  HandCoins, Wallet, BarChart3,
} from 'lucide-react'
import { useState } from 'react'
import { authService } from '@/lib/auth'
import { NewTransactionDrawer } from '@/components/transactions/NewTransactionDrawer'
import { useAutoSnapshot } from '@/lib/hooks/useAutoSnapshot'

const NAV = [
  { href: '/',             label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/portfolio',    label: 'Portfólio',    icon: Briefcase       },
  { href: '/patrimony',    label: 'Patrimônio',   icon: Wallet          },
  { href: '/performance',  label: 'Rentabilidade',icon: BarChart3       },
  { href: '/dividends',    label: 'Proventos',    icon: HandCoins       },
  { href: '/transactions', label: 'Transações',   icon: ArrowLeftRight  },
  { href: '/allocation',   label: 'Alocação',     icon: PieChart        },
]

// Itens que aparecem na bottom nav do mobile (máx 4 + botão central "+")
const BOTTOM_NAV = [
  { href: '/',             label: 'Início',    icon: LayoutDashboard },
  { href: '/portfolio',    label: 'Portfólio', icon: Briefcase       },
  { href: '/dividends',    label: 'Proventos', icon: HandCoins       },
  { href: '/transactions', label: 'Lançamentos', icon: ArrowLeftRight },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen]             = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useAutoSnapshot()

  const handleLogout = () => {
    authService.logout()
    router.push('/login')
  }

  const NavLinks = () => (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${
                active
                  ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary-text)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]'
              }
            `}
          >
            <Icon size={17} strokeWidth={active ? 2.5 : 2} />
            {label}
          </Link>
        )
      })}
    </nav>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--color-border-subtle)]">
        <div className="w-7 h-7 rounded-md bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
          <TrendingUp size={14} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-none">SGFP</p>
          <p className="text-[10px] text-[var(--color-text-faint)] mt-0.5">Gestão Financeira</p>
        </div>
      </div>

      <NavLinks />

      <div className="px-3 py-4 border-t border-[var(--color-border-subtle)]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)] transition-colors"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-dvh bg-[var(--color-bg)] overflow-hidden">

      {/* ── Sidebar desktop (≥ lg) ── */}
      <aside className="hidden lg:flex w-56 flex-col flex-shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border-subtle)]">
        <SidebarContent />
      </aside>

      {/* ── Drawer overlay mobile ── */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />
      )}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 flex flex-col
        bg-[var(--color-surface)] border-r border-[var(--color-border-subtle)]
        transform transition-transform duration-200 lg:hidden
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-[var(--color-primary)] flex items-center justify-center">
              <TrendingUp size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold">SGFP</span>
          </div>
          <button onClick={() => setOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <X size={18} />
          </button>
        </div>
        <NavLinks />
        <div className="px-3 py-4 border-t border-[var(--color-border-subtle)]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)] transition-colors"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Área de conteúdo ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top bar mobile (< lg) */}
        <header className="flex lg:hidden items-center gap-3 px-4 h-14 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)] flex-shrink-0">
          <button onClick={() => setOpen(true)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--color-primary)] flex items-center justify-center">
              <TrendingUp size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold">SGFP</span>
          </div>
        </header>

        {/* Conteúdo principal — padding-bottom para não ficar sob a bottom nav */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* ── Bottom Navigation Bar (mobile < lg) ── */}
      <nav className="
        fixed bottom-0 inset-x-0 z-30
        flex lg:hidden items-stretch
        bg-[var(--color-surface)] border-t border-[var(--color-border-subtle)]
        safe-area-inset-bottom
      " style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

        {/* Primeiros 2 itens */}
        {BOTTOM_NAV.slice(0, 2).map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors
                ${active ? 'text-[var(--color-primary-text)]' : 'text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]'}
              `}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
            </Link>
          )
        })}

        {/* Botão "+" central */}
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Novo lançamento"
            className="
              w-12 h-12 rounded-full -mt-5
              bg-[var(--color-primary)] text-white shadow-lg
              hover:bg-[var(--color-primary-hover)]
              flex items-center justify-center
              transition-all duration-200 hover:scale-105 active:scale-95
              focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2
            "
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* Últimos 2 itens */}
        {BOTTOM_NAV.slice(2).map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors
                ${active ? 'text-[var(--color-primary-text)]' : 'text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]'}
              `}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* FAB desktop (≥ lg) — mantido só no desktop */}
      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="Novo lançamento"
        className="
          hidden lg:flex
          fixed bottom-6 right-6 z-30 rounded-full
          bg-[var(--color-primary)] text-white shadow-lg
          hover:bg-[var(--color-primary-hover)]
          items-center justify-center
          transition-all duration-200 hover:scale-105 active:scale-95
          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2
        "
        style={{ width: 52, height: 52 }}
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      <NewTransactionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}
