'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TrendingUp, Eye, EyeOff, Loader2 } from 'lucide-react'
import { authService } from '@/lib/auth'

const loginSchema = z.object({
  username: z.string().min(1, 'Usuário obrigatório'),
  password: z.string().min(1, 'Senha obrigatória'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router   = useRouter()
  const [showPw, setShowPw]   = useState(false)
  const [error,  setError]    = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginForm) => {
    setError('')
    try {
      await authService.login(data.username, data.password)
      router.push('/')
    } catch {
      setError('Usuário ou senha incorretos')
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-widest text-[var(--color-text-muted)] uppercase">Sistema de Gestão Financeira</p>
            <p className="text-lg font-semibold leading-none">SGFP</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] rounded-xl p-6">
          <h1 className="text-base font-semibold mb-1">Entrar na conta</h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">Acesse seu painel de investimentos</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Usuário</label>
              <input
                {...register('username')}
                autoComplete="username"
                className="w-full px-3 py-2 text-sm bg-[var(--color-surface-3)] border border-[var(--color-border-subtle)] rounded-lg placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                placeholder="seu usuário"
              />
              {errors.username && <p className="mt-1 text-xs text-[var(--color-error)]">{errors.username.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Senha</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full px-3 py-2 pr-10 text-sm bg-[var(--color-surface-3)] border border-[var(--color-border-subtle)] rounded-lg placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-[var(--color-error)]">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="px-3 py-2 bg-[var(--color-error-muted)] border border-[var(--color-error)]/20 rounded-lg">
                <p className="text-xs text-[var(--color-error)]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : null}
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--color-text-faint)]">
          SGFP v0.3.0 — uso interno
        </p>
      </div>
    </div>
  )
}
