import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { FixedIncomePosition } from '@/lib/api'

export function useFixedIncomePositions() {
  return useQuery<FixedIncomePosition[]>({
    queryKey: ['fixed-income'],
    queryFn:  () => api.get('/fixed-income').then(r => r.data),
    staleTime: 1000 * 60 * 5,
  })
}

export function useRedeemFixedIncome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ assetId, body }: {
      assetId: string
      body: { quantity: number; redeemDate?: string }
    }) => api.post(`/fixed-income/${assetId}/redeem`, body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-income'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-items'] })
    },
  })
}
