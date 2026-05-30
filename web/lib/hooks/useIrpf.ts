import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { IrpfSummary } from '@/lib/types/irpf'

export function useIrpf(year: number) {
  return useQuery<IrpfSummary>({
    queryKey: ['irpf', year],
    queryFn:  async () => {
      const res = await api.get<IrpfSummary>(`/irpf?year=${year}`)
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}
