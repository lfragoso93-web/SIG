'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const INTERVAL_MS = 60 * 60 * 1000 // 1 hora

/**
 * Hook que dispara automaticamente um snapshot diário a cada 1 hora
 * enquanto o usuário está com o dashboard aberto.
 *
 * - Fire-and-forget: erros não afetam a UI
 * - Após sucesso, invalida o cache de snapshots para atualizar o gráfico
 * - Para quando o componente desmonta (navega para /login)
 */
export function useAutoSnapshot() {
  const queryClient = useQueryClient()
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  const runSnapshot = async () => {
    try {
      const res = await api.post<{ skipped: boolean }>('/portfolio-snapshots/generate', { period: 'DAILY' })
      if (!res.data.skipped) {
        // Atualiza o gráfico do dashboard e dados de performance
        queryClient.invalidateQueries({ queryKey: ['snapshots'] })
        queryClient.invalidateQueries({ queryKey: ['performance'] })
        console.log('[auto-snapshot] Snapshot horário gerado com sucesso.')
      }
    } catch {
      // Silencioso — não perturba o usuário
    }
  }

  useEffect(() => {
    // Agenda execução horária
    timerRef.current = setInterval(runSnapshot, INTERVAL_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
