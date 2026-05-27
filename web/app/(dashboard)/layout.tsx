'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  TrendingUp, LayoutDashboard, Briefcase, Building2,
  PiggyBank, ArrowLeftRight, PieChart, LogOut, Menu, X,
} from 'lucide-react'
import { useState } from 'react'
import { authService } from '@/lib/auth'

const NAV = [
  { href: '/',               label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/portfolio',      label: 'Portfólio',      icon: Briefcase       },
  { href: '/treasury',       label: 'Tesouro Direto', icon: Building2       },
  { href: '/fixed-income',   label: 'Renda Fixa',     icon: PiggyBank       },
  { href: '/transactions',   label: 'Transações',    icon: ArrowLeftRight  },
  { href: '/allocation',     label: 'Alocação',      icon: PieChart        },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname()
  const router      = useRouter()
  const [open, setOpen] = useState(false)

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
              flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                active
                  ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary-text)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]'
              }
            `}
          >
            <Icon size={16} strokeWidth={active ? 2.5 : 2} />
            {label}
          </Link>
        )
      })}
    </nav>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
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

      {/* Rodapé */}
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

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-56 flex-col flex-shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border-subtle)]">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
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
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Header mobile */}
        <header className="flex lg:hidden items-center gap-3 px-4 h-14 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)] flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--color-primary)] flex items-center justify-center">
              <TrendingUp size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold">SGFP</span>
          </div>
        </header>

        {/* Conteúdo da página */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
