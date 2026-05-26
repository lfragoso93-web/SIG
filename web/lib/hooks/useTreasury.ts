import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { TreasuryPosition } from '@/lib/api'

export function useTreasuryPositions() {
  return useQuery<TreasuryPosition[]>({
    queryKey: ['treasury'],
    queryFn:  () => api.get('/treasury').then(r => r.data),
    staleTime: 1000 * 60 * 5,
  })
}

export function useRedeemTreasury() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ assetId, body }: {
      assetId: string
      body: { quantity: number; redeemDate?: string; redeemUnitPrice?: number }
    }) => api.post(`/treasury/${assetId}/redeem`, body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-items'] })
    },
  })
}
